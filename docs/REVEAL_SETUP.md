# AI Progressive Reveal Feature Setup

This document describes how to configure and deploy the AI Undressing / Progressive Reveal feature.

## Overview

- **Teaser video**: 6–8 sec half-nude loop shown on profile view/match (with mutual explicit opt-in)
- **Progressive reveal**: Full video on tap after consent (gated by premium/credits)
- **Backend**: ComfyUI on RunPod GPU (I2V: Wan 2.2, AnimateDiff, ControlNet/inpainting)

## Prerequisites

- Firebase project with Firestore, Storage, and Functions
- RunPod GPU instance running ComfyUI
- ComfyUI workflow for I2V (image-to-video) with clothing removal/mask

## Cloud Function Deployment

1. **Set environment variables** (Firebase Console → Functions → Configuration, or `.env`):

   - `RUNPOD_COMFYUI_URL` or `COMFYUI_URL`: Your ComfyUI API base URL (e.g. `https://xxxx.runpod.ai`)
   - `RUNPOD_API_KEY` or `COMFYUI_API_KEY`: API key for RunPod/ComfyUI auth (optional)

2. **Replace ComfyUI workflow** in `functions/reveal-video.js`:

   The default `buildComfyUIWorkflow()` is a placeholder. Replace it with your actual Wan 2.2 / AnimateDiff / ControlNet workflow JSON that:
   - Accepts an input image
   - Produces a short video (GIF or MP4) with the desired effect
   - Outputs to the SaveImage or VideoHelper nodes

3. **Deploy**:

   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```

## Firestore

The following fields are used on `user_profiles/{uid}`:

- `revealTeaserUrl`: URL of teaser video (half-nude loop)
- `revealedVideoUrl`: URL of full progressive reveal
- `revealGenStatus`: `'idle' | 'pending' | 'ready' | 'failed'`
- `revealGenUpdatedAt`, `revealGenError` (optional, for debugging)

## Gating

- **Explicit opt-in**: Both viewer and profile owner must have `explicitContentOptIn` enabled (users collection or user_profiles)
- **Age**: 18+
- **Premium or credits**: Viewing reveal costs 3 credits (free users); premium users have unlimited access
- **Generation**: Triggering generation requires premium or 3 credits

## PWA Offline

The `/profile`, `/dashboard`, and `/matches` routes are cached by the service worker. Teaser/reveal video URLs are fetched when online; offline, the app falls back to cached pages and static images.
