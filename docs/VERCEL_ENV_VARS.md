# Vercel Environment Variables for nueflirt.com

Add these in **Vercel** → your project → **Settings** → **Environment Variables**.

---

## Required (for AI features)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| **`GEMINI_API_KEY`** | Google AI (Gemini) API key for Genkit flows | [Google AI Studio](https://aistudio.google.com/apikey) – Create API key. Used for: AI bio suggestion, icebreaker generation, AI avatar, profile video, interactive reveal. |

Without this, server-side AI (bio suggest, icebreakers, avatar/video generation) will fail.

---

## Optional (Firebase from env)

Your app currently uses **hardcoded** Firebase config in `src/firebase/config.ts`. You only need these if you switch config to use env vars (e.g. different project for staging/prod):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `studio-2931927133-a7d7c.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web app ID |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Optional; leave empty if not using Analytics |

If you keep the hardcoded config, **you don’t need to add any Firebase variables in Vercel**.

---

## Not needed on Vercel (Firebase / RunPod)

These are for **Firebase Cloud Functions**, not for the Next.js app on Vercel. Configure them in **Firebase** → **Functions** → **Configuration** (or Secret Manager):

- `RUNPOD_COMFYUI_URL` / `COMFYUI_URL` – ComfyUI/RunPod endpoint (reveal video generation)
- `RUNPOD_API_KEY` / `COMFYUI_API_KEY` – RunPod API key (optional)
- `ADMIN_SECRET` / `LIBRARY_ADMIN_SECRET` – For `batchLibraryVideos` HTTP admin endpoint

---

## Summary for nueflirt.com on Vercel

**Minimum to add in Vercel:**

1. **`GEMINI_API_KEY`** – Your Gemini API key (required for AI features).

**After deploy:**

1. **Firebase Console** → **Authentication** → **Settings** → **Authorized domains**  
   Add: `nueflirt.com` and `www.nueflirt.com` (and your Vercel preview URL if you use it).

2. **Firebase Console** → **Firestore** → **Rules**  
   Deploy your rules so `library_videos` and other collections work:  
   `firebase deploy --only firestore:rules`

That’s all you need for the app to run on Vercel with the current code.
