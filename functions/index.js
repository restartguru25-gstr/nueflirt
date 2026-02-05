/**
 * Firebase Cloud Functions for Nue Flirt.
 * - expireSituationshipMatches: scheduled daily; marks matches with expiresAt < now as expired.
 * - generateRevealVideo: callable; triggers ComfyUI on RunPod for reveal video generation.
 * - purchaseLibraryPass: callable; updates user library_session for time-based access.
 * - batchLibraryVideos: HTTP (admin); batch-generates library videos via ComfyUI.
 *
 * Deploy: cd functions && npm install && firebase deploy --only functions
 * Requires: firebase-admin, firebase-functions (see package.json).
 * Env: RUNPOD_COMFYUI_URL, RUNPOD_API_KEY, ADMIN_SECRET (for batchLibraryVideos)
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError, onRequest } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { initializeApp } = require('firebase-admin/app');

initializeApp();
const db = getFirestore();

const REVEAL_CREDITS_COST = 3;

exports.expireSituationshipMatches = onSchedule(
  { schedule: '0 0 * * *', timeZone: 'Asia/Kolkata' }, // daily at midnight IST
  async () => {
    const now = new Date();
    const matchesRef = db.collection('matches');
    const snapshot = await matchesRef.where('expiresAt', '<', now).get();

    const batch = db.batch();
    snapshot.docs.forEach((docSnap) => {
      if (docSnap.get('expired') !== true) {
        batch.update(docSnap.ref, { expired: true });
      }
    });
    if (snapshot.size > 0) {
      await batch.commit();
    }
    console.log(`Marked ${snapshot.size} matches as expired.`);
    return null;
  }
);

exports.generateRevealVideo = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }
    const uid = request.auth.uid;
    const { photoUrl } = request.data || {};
    if (!photoUrl || typeof photoUrl !== 'string') {
      throw new HttpsError('invalid-argument', 'photoUrl is required.');
    }

    const profileRef = db.collection('user_profiles').doc(uid);
    const profileSnap = await profileRef.get();
    const profile = profileSnap?.data();
    const userSnap = await db.collection('users').doc(uid).get();
    const userData = userSnap?.data();
    const explicitOptIn = profile?.explicitContentOptIn ?? userData?.explicitContentOptIn;

    if (!explicitOptIn) {
      throw new HttpsError('failed-precondition', 'Explicit content opt-in required.');
    }
    if (profile?.age < 18) {
      throw new HttpsError('failed-precondition', 'Must be 18+ to use this feature.');
    }

    const subSnap = await db.collection('subscriptions').doc(uid).get();
    const creditsSnap = await db.collection('credit_balances').doc(uid).get();
    const subscription = subSnap?.data();
    const credits = creditsSnap?.data?.balance ?? 0;
    const isPremium = subscription?.planType === 'premium';
    if (!isPremium && credits < REVEAL_CREDITS_COST) {
      throw new HttpsError('failed-precondition', 'Premium or credits required.');
    }

    const runpodUrl = process.env.RUNPOD_COMFYUI_URL || process.env.COMFYUI_URL;
    const apiKey = process.env.RUNPOD_API_KEY || process.env.COMFYUI_API_KEY;

    if (!runpodUrl) {
      throw new HttpsError('failed-precondition', 'Reveal service not configured.');
    }

    await profileRef.update({
      revealGenStatus: 'pending',
      revealGenUpdatedAt: new Date(),
    });

    try {
      const { fetchImageAsBase64, runComfyUIWorkflow, uploadToStorage, downloadAsBuffer } = require('./reveal-video');
      const bucket = getStorage().bucket();
      const imageBase64 = await fetchImageAsBase64(photoUrl);
      const outputUrl = await runComfyUIWorkflow(runpodUrl, apiKey, imageBase64);
      const buffer = await downloadAsBuffer(outputUrl);
      const timestamp = Date.now();
      const teaserUrl = await uploadToStorage(bucket, uid, `teaser_${timestamp}.mp4`, buffer);
      const revealedUrl = await uploadToStorage(bucket, uid, `revealed_${timestamp}.mp4`, buffer);

      if (!isPremium) {
        await db.collection('credit_balances').doc(uid).update({
          balance: Math.max(0, credits - REVEAL_CREDITS_COST),
        });
      }

      await profileRef.update({
        revealTeaserUrl: teaserUrl,
        revealedVideoUrl: revealedUrl,
        revealGenStatus: 'ready',
        revealGenUpdatedAt: new Date(),
      });

      return {
        success: true,
        teaserUrl,
        revealedUrl,
        status: 'ready',
      };
    } catch (err) {
      await profileRef.update({
        revealGenStatus: 'failed',
        revealGenUpdatedAt: new Date(),
        revealGenError: err?.message || 'Unknown error',
      });
      throw new HttpsError('internal', err?.message || 'Reveal generation failed.');
    }
  }
);

const LIBRARY_PASS_DURATIONS = { '30min': 30, '1hr': 60, '24hr': 24 * 60 };
const LIBRARY_PASS_PRICES = { '30min': 99, '1hr': 199, '24hr': 499 };

exports.purchaseLibraryPass = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }
    const uid = request.auth.uid;
    const { passId, durationMinutes, priceInr } = request.data || {};

    if (!passId || typeof durationMinutes !== 'number' || typeof priceInr !== 'number') {
      throw new HttpsError('invalid-argument', 'passId, durationMinutes, priceInr required.');
    }

    const expectedDuration = LIBRARY_PASS_DURATIONS[passId];
    const expectedPrice = LIBRARY_PASS_PRICES[passId];
    if (expectedDuration !== durationMinutes || expectedPrice !== priceInr) {
      throw new HttpsError('invalid-argument', 'Invalid pass.');
    }

    // TODO: Verify payment via Razorpay webhook or server-side verification.
    // For now, simulate success (admin should enable verification in production).
    const now = new Date();
    const expiry = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const usersRef = db.collection('users').doc(uid);
    await usersRef.set(
      { library_session: { start: now, expiry } },
      { merge: true }
    );

    return {
      success: true,
      session: {
        start: now.getTime(),
        expiry: expiry.getTime(),
      },
    };
  }
);

exports.batchLibraryVideos = onRequest(
  { enforceAppCheck: false },
  async (req, res) => {
    const authHeader = req.headers.authorization;
    const adminSecret = process.env.ADMIN_SECRET || process.env.LIBRARY_ADMIN_SECRET;
    if (adminSecret && authHeader !== `Bearer ${adminSecret}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const runpodUrl = process.env.RUNPOD_COMFYUI_URL || process.env.COMFYUI_URL;
    const apiKey = process.env.RUNPOD_API_KEY || process.env.COMFYUI_API_KEY;
    if (!runpodUrl) {
      res.status(500).json({ error: 'ComfyUI not configured' });
      return;
    }

    const prompts = req.body?.prompts || [
      { prompt: 'saree undress animation, 8 sec', category: 'indian_traditional', title: 'Saree Reveal' },
      { prompt: 'modern dress reveal, 6 sec', category: 'modern_fantasy', title: 'Modern Fantasy' },
    ];

    const bucket = getStorage().bucket();
    const created = [];

    try {
      const { runComfyUIWorkflow, uploadToStorage, downloadAsBuffer } = require('./reveal-video');
      const imagePlaceholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      for (let i = 0; i < prompts.length; i++) {
        const p = prompts[i];
        const imageBase64 = imagePlaceholder.split(',')[1] || '';
        const outputUrl = await runComfyUIWorkflow(runpodUrl, apiKey, imageBase64);
        const buffer = await downloadAsBuffer(outputUrl);
        const ts = Date.now();
        const videoUrl = await uploadToStorage(bucket, 'library', `batch_${ts}_${i}.mp4`, buffer);

        const docRef = await db.collection('library_videos').add({
          videoUrl,
          teaserUrl: videoUrl,
          category: p.category || 'general',
          duration: 8,
          popularity: 0,
          tags: [p.category, p.prompt?.split(' ')[0]].filter(Boolean),
          title: p.title || p.category,
          createdAt: new Date(),
        });
        created.push({ id: docRef.id, title: p.title, category: p.category });
      }

      res.status(200).json({ success: true, created });
    } catch (err) {
      console.error('batchLibraryVideos error:', err);
      res.status(500).json({ error: err?.message || 'Batch generation failed' });
    }
  }
);

exports.incrementLibraryView = onCall(
  { enforceAppCheck: false },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { videoId } = request.data || {};
    if (!videoId || typeof videoId !== 'string') {
      throw new HttpsError('invalid-argument', 'videoId required.');
    }
    const ref = db.collection('library_videos').doc(videoId);
    const { FieldValue } = require('firebase-admin/firestore');
    await ref.update({
      popularity: FieldValue.increment(1),
    });
    return { success: true };
  }
);
