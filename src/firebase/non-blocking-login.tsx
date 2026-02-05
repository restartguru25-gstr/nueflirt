'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
} from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

function handleAuthError(error: unknown) {
  const err = error as { code?: string; message?: string };
  let title = 'Authentication Error';
  let description = err?.message ?? 'An unexpected error occurred.';

  switch (err?.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      title = 'Login Failed';
      description = 'Incorrect email or password. Please try again.';
      break;
    case 'auth/email-already-in-use':
      title = 'Sign-up Failed';
      description = 'An account with this email already exists. Please log in.';
      break;
    case 'auth/weak-password':
      title = 'Sign-up Failed';
      description = 'The password is too weak. Please use a stronger password.';
      break;
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return; // User closed popup, no toast
    case 'auth/account-exists-with-different-credential':
      title = 'Account exists';
      description = 'An account already exists with the same email but different sign-in method. Try signing in with email/password or link accounts in settings.';
      break;
  }

  toast({
    variant: 'destructive',
    title,
    description,
  });
}

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth, onFinally?: () => void): void {
  signInAnonymously(authInstance)
    .catch(handleAuthError)
    .finally(() => onFinally?.());
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string, onFinally?: () => void): void {
  createUserWithEmailAndPassword(authInstance, email, password)
    .catch(handleAuthError)
    .finally(() => onFinally?.());
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string, onFinally?: () => void): void {
  signInWithEmailAndPassword(authInstance, email, password)
    .catch(handleAuthError)
    .finally(() => onFinally?.());
}

/** Initiate Google sign-in with popup. On first sign-in, user may need to complete profile (redirect to /signup/complete or merge from Google displayName/photoURL). */
export function initiateGoogleSignIn(authInstance: Auth, onFinally?: () => void): void {
  const provider = new GoogleAuthProvider();
  signInWithPopup(authInstance, provider)
    .catch(handleAuthError)
    .finally(() => onFinally?.());
}

/** Initiate Facebook sign-in with popup. Enable Facebook in Firebase Console > Authentication > Sign-in method. */
export function initiateFacebookSignIn(authInstance: Auth, onFinally?: () => void): void {
  const provider = new FacebookAuthProvider();
  signInWithPopup(authInstance, provider)
    .catch(handleAuthError)
    .finally(() => onFinally?.());
}

/** Initiate Apple sign-in with popup. Enable Apple in Firebase Console and configure Apple Developer. */
export function initiateAppleSignIn(authInstance: Auth, onFinally?: () => void): void {
  const provider = new OAuthProvider('apple.com');
  signInWithPopup(authInstance, provider)
    .catch(handleAuthError)
    .finally(() => onFinally?.());
}

/** Create RecaptchaVerifier for phone auth. ContainerId = element id for invisible recaptcha, or pass container element. */
export function createPhoneRecaptcha(authInstance: Auth, containerIdOrElement: string | HTMLElement): RecaptchaVerifier {
  const options = typeof containerIdOrElement === 'string'
    ? { size: 'invisible' as const }
    : { size: 'invisible' as const };
  return new RecaptchaVerifier(authInstance, containerIdOrElement, options);
}

/** Send OTP to phone number (E.164, e.g. +919876543210). Returns confirmationResult for verify step. */
export async function sendPhoneOtp(
  authInstance: Auth,
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(authInstance, phoneNumber, recaptchaVerifier);
}

/** Verify OTP and complete phone sign-in. */
export function confirmPhoneOtp(
  confirmationResult: ConfirmationResult,
  otp: string,
  onFinally?: () => void
): void {
  confirmationResult
    .confirm(otp)
    .catch(handleAuthError)
    .finally(() => onFinally?.());
}
