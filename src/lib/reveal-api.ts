/**
 * Client API for reveal video generation (calls Firebase Callable Function).
 */

import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface GenerateRevealInput {
  photoUrl: string;
}

export interface GenerateRevealResult {
  success: boolean;
  teaserUrl?: string;
  revealedUrl?: string;
  status?: 'pending' | 'ready' | 'failed';
  error?: string;
}

export async function triggerRevealGeneration(photoUrl: string): Promise<GenerateRevealResult> {
  const app = getApp();
  const functions = getFunctions(app);
  const generateReveal = httpsCallable<GenerateRevealInput, GenerateRevealResult>(functions, 'generateRevealVideo');
  const result = await generateReveal({ photoUrl });
  return result.data;
}
