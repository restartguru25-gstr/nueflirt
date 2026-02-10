/**
 * One-off test for AI profile video generation.
 * Run: npm run test:profile-video
 * Or:  GEMINI_API_KEY=your_key npx tsx scripts/test-ai-profile-video.ts
 *
 * Requires GEMINI_API_KEY in env (e.g. in .env.local).
 * Uses a minimal test image; real photos may produce better results.
 * Video can take up to ~1 minute to generate.
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env.local') });
config(); // .env as fallback

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY. Set it in .env.local or: GEMINI_API_KEY=... npx tsx scripts/test-ai-profile-video.ts');
  process.exit(1);
}

// Minimal 1x1 PNG (valid data URI) so the API receives a valid image
const MINI_PNG_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function main() {
  const { genkit } = await import('genkit');
  const { googleAI } = await import('@genkit-ai/google-genai');

  const ai = genkit({
    plugins: [googleAI({ apiKey: GEMINI_API_KEY })],
  });

  const stylePrompt = 'modern';
  const textPrompt = `Generate a short, SFW (safe for work) video in the style of ${stylePrompt} based on the following photo. The video should be suitable for use as a dating profile teaser. Do not include any explicit or suggestive content.`;

  console.log('Calling Veo (googleai/veo-2.0-generate-001)...');
  let result: { operation?: { name?: string; done?: boolean; error?: { message?: string }; output?: { message?: { content?: Array<{ media?: { url?: string } }> } } } } = {};
  try {
    result = await ai.generate({
      model: 'googleai/veo-2.0-generate-001',
      prompt: [
        { text: textPrompt },
        { media: { url: MINI_PNG_DATA_URI, contentType: 'image/png' } },
      ],
      config: {
        aspectRatio: '16:9',
        personGeneration: 'allow_adult',
      },
    });
  } catch (e: unknown) {
    console.error('ai.generate failed:', e);
    process.exit(1);
  }

  let operation = result.operation;
  if (!operation) {
    console.error('Expected the model to return an operation. Got:', JSON.stringify(result, null, 2).slice(0, 500));
    process.exit(1);
  }

  console.log('Operation started. Polling every 5s (can take up to ~1 min)...');
  while (!operation.done) {
    await new Promise((r) => setTimeout(r, 5000));
    operation = await ai.checkOperation(operation);
    console.log('  ... still generating');
  }

  if (operation.error) {
    console.error('Operation error:', operation.error.message);
    process.exit(1);
  }

  const video = operation.output?.message?.content?.find((p: { media?: unknown }) => !!p.media);
  if (!video?.media?.url) {
    console.error('No video in response. output:', JSON.stringify(operation.output, null, 2).slice(0, 800));
    process.exit(1);
  }

  const url = video.media.url;
  const isDataUri = url.startsWith('data:');
  console.log('OK – AI profile video generated successfully.');
  console.log('Video URL type:', isDataUri ? 'data URI' : 'external URL');
  console.log('Length (chars):', url.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
