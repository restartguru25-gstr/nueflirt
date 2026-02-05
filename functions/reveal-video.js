/**
 * ComfyUI/RunPod integration for reveal video generation.
 * Environment: RUNPOD_COMFYUI_URL, RUNPOD_API_KEY (or COMFYUI_API_KEY)
 */

const { getStorage } = require('firebase-admin/storage');
const { getFirestore } = require('firebase-admin/firestore');

const REVEAL_PROMPT = 'smooth clothing fade/remove, natural motion, 8 seconds, realistic, Indian style optional';
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60; // 3 minutes

/**
 * Build a minimal ComfyUI workflow for I2V (image-to-video).
 * Replace with your actual Wan 2.2 / AnimateDiff workflow JSON.
 */
function buildComfyUIWorkflow(imageBase64, prompt) {
  return {
    "3": {
      "inputs": {
        "seed": Math.floor(Math.random() * 1e12),
        "steps": 20,
        "cfg": 7.5,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 1,
        "model": ["4", 0],
        "positive": ["6", 0],
        "negative": ["7", 0],
        "latent_image": ["5", 0]
      },
      "class_type": "KSampler"
    },
    "4": { "inputs": {}, "class_type": "CheckpointLoaderSimple" },
    "5": { "inputs": { "width": 512, "height": 768, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
    "6": { "inputs": { "text": prompt }, "class_type": "CLIPTextEncode" },
    "7": { "inputs": { "text": "" }, "class_type": "CLIPTextEncode" },
    "8": { "inputs": { "samples": ["3", 0], "vae": ["4", 2] }, "class_type": "VAEDecode" },
    "9": { "inputs": { "filename_prefix": "reveal", "images": ["8", 0] }, "class_type": "SaveImage" }
  };
}

async function fetchImageAsBase64(url) {
  if (typeof url !== 'string') throw new Error('Invalid photo URL');
  if (url.startsWith('data:')) {
    const match = url.match(/^data:[^;]+;base64,(.+)$/);
    if (match) return match[1];
    throw new Error('Invalid data URL format');
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf).toString('base64');
}

async function runComfyUIWorkflow(baseUrl, apiKey, imageBase64) {
  const workflow = buildComfyUIWorkflow(imageBase64, REVEAL_PROMPT);
  const body = { prompt: { workflow } };
  const headers = {
    'Content-Type': 'application/json',
    ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
  };
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/prompt`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ComfyUI prompt failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const promptId = data.prompt_id;
  if (!promptId) throw new Error('ComfyUI did not return prompt_id');

  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const historyRes = await fetch(`${baseUrl.replace(/\/$/, '')}/history/${promptId}`, { headers });
    if (!historyRes.ok) continue;
    const history = await historyRes.json();
    const entry = history[promptId];
    if (!entry) continue;
    if (entry.status?.status_str === 'error') {
      throw new Error(entry.status?.messages?.join(', ') || 'ComfyUI job failed');
    }
    const outputs = entry?.outputs;
    if (!outputs) continue;
    for (const nodeId of Object.keys(outputs)) {
      const node = outputs[nodeId];
      if (node.images && node.images.length > 0) {
        const img = node.images[0];
        const imgUrl = `${baseUrl.replace(/\/$/, '')}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type || 'output'}`;
        return imgUrl;
      }
      if (node.gifs && node.gifs.length > 0) {
        const gif = node.gifs[0];
        const gifUrl = `${baseUrl.replace(/\/$/, '')}/view?filename=${gif.filename}&subfolder=${gif.subfolder || ''}&type=${gif.type || 'output'}`;
        return gifUrl;
      }
    }
  }
  throw new Error('ComfyUI job timed out');
}

async function uploadToStorage(bucket, userId, filename, buffer, contentType = 'video/mp4') {
  const path = `reveal_videos/${userId}/${filename}`;
  const file = bucket.file(path);
  await file.save(buffer, { metadata: { contentType } });
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
  });
  return url;
}

async function downloadAsBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

module.exports = {
  buildComfyUIWorkflow,
  fetchImageAsBase64,
  runComfyUIWorkflow,
  uploadToStorage,
  downloadAsBuffer,
  REVEAL_PROMPT,
};
