# AI Undressed Video Library Setup

## Overview

- **Library**: Curated pre-generated 6–8 sec reveal videos (batch-created via ComfyUI on RunPod).
- **Time passes**: ₹99/30 min, ₹199/1 hr, ₹499/24 hr via UPI (Razorpay).
- **Access**: Free teasers (blurred); full playback unlocked with time pass or VIP (premium).

## Firestore Schema

### `library_videos/{videoId}`
```json
{
  "videoUrl": "https://storage.../video.mp4",
  "teaserUrl": "https://storage.../teaser.mp4",
  "category": "indian_traditional | modern_fantasy | contemporary | classic",
  "duration": 8,
  "popularity": 0,
  "tags": ["saree", "traditional"],
  "title": "Saree Reveal",
  "thumbnailUrl": "https://...",
  "createdAt": "timestamp"
}
```

### `users/{userId}` (extended)
```json
{
  "library_session": {
    "start": "timestamp",
    "expiry": "timestamp"
  }
}
```

## Cloud Functions

### `purchaseLibraryPass` (callable)
- **Input**: `{ passId, durationMinutes, priceInr }`
- **Action**: Updates `users/{uid}.library_session` with start/expiry.
- **TODO**: Integrate Razorpay webhook for payment verification.

### `batchLibraryVideos` (HTTP, admin)
- **Auth**: `Authorization: Bearer ${ADMIN_SECRET}`
- **Body**: `{ prompts: [{ prompt, category, title }] }`
- **Action**: Calls ComfyUI, uploads to Storage, adds docs to `library_videos`.
- **Env**: `RUNPOD_COMFYUI_URL`, `RUNPOD_API_KEY`, `ADMIN_SECRET`

### `incrementLibraryView` (callable)
- **Input**: `{ videoId }`
- **Action**: Increments `library_videos/{videoId}.popularity` for sorting.

## Firestore Index

For `library_videos` ordered by `popularity`:
```
Collection: library_videos
Fields: popularity (Descending)
```

Create in Firebase Console → Firestore → Indexes if needed.

## Razorpay Integration

1. Create Razorpay order on client before calling `purchaseLibraryPass`.
2. Capture payment via UPI.
3. On success webhook, call `purchaseLibraryPass` or update `library_session` via admin.
4. For now, `purchaseLibraryPass` simulates success (no verification).

## Run Batch Generation

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"prompts":[{"prompt":"saree undress animation, 8 sec","category":"indian_traditional","title":"Saree Reveal"}]}' \
  https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/batchLibraryVideos
```
