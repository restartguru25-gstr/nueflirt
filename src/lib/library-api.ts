/**
 * Client API for library payment (calls Firebase Callable Function).
 */

import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { LibraryTimePass } from '@/types';

export interface PurchaseLibraryPassInput {
  passId: string;
  durationMinutes: number;
  priceInr: number;
}

export interface PurchaseLibraryPassResult {
  success: boolean;
  session?: { start: number; expiry: number };
  error?: string;
}

export async function purchaseLibraryPass(pass: LibraryTimePass): Promise<PurchaseLibraryPassResult> {
  const app = getApp();
  const functions = getFunctions(app);
  const purchase = httpsCallable<PurchaseLibraryPassInput, PurchaseLibraryPassResult>(
    functions,
    'purchaseLibraryPass'
  );
  const result = await purchase({
    passId: pass.id,
    durationMinutes: pass.durationMinutes,
    priceInr: pass.priceInr,
  });
  return result.data;
}

export async function incrementLibraryView(videoId: string): Promise<void> {
  const app = getApp();
  const functions = getFunctions(app);
  const fn = httpsCallable<{ videoId: string }, { success: boolean }>(functions, 'incrementLibraryView');
  await fn({ videoId });
}
