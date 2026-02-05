'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VideoRevealPlayerProps {
  /** Profile owner's name. */
  profileName: string;
  /** Static image fallback. */
  fallbackImageUrl?: string;
  /** 6–8 sec teaser video (half-nude loop). */
  teaserVideoUrl?: string | null;
  /** Full progressive reveal video. */
  revealedVideoUrl?: string | null;
  /** Generation status for revealed video. */
  revealGenStatus?: 'idle' | 'pending' | 'ready' | 'failed';
  /** Whether viewer can access revealed content (premium/credits + explicit opt-in). */
  canReveal: boolean;
  /** Callback when user taps to reveal (triggers consent flow). */
  onRevealRequest?: () => void;
  /** Callback to trigger generation (e.g. start ComfyUI job). */
  onTriggerGeneration?: () => Promise<void>;
  /** Credits cost to show in consent modal. */
  creditsCost?: number;
  /** Custom class for the video container. */
  className?: string;
  /** Aspect ratio class for the container. */
  aspectRatio?: string;
}

export function VideoRevealPlayer({
  profileName,
  fallbackImageUrl,
  teaserVideoUrl,
  revealedVideoUrl,
  revealGenStatus = 'idle',
  canReveal,
  onRevealRequest,
  onTriggerGeneration,
  creditsCost = 0,
  className,
  aspectRatio = 'aspect-[3/4]',
}: VideoRevealPlayerProps) {
  const [consentOpen, setConsentOpen] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const showTeaser = (teaserVideoUrl && !videoError) || !revealedVideoUrl;
  const hasRevealedContent = revealGenStatus === 'ready' && revealedVideoUrl;
  const showRevealed = isRevealed && hasRevealedContent && !videoError;

  const handleTap = useCallback(() => {
    if (!canReveal) {
      onRevealRequest?.();
      return;
    }
    if (hasRevealedContent) {
      setConsentOpen(true);
      return;
    }
    if (revealGenStatus === 'pending') {
      return; // Show loading
    }
    if (revealGenStatus === 'failed' || revealGenStatus === 'idle') {
      onTriggerGeneration?.();
      return;
    }
  }, [canReveal, hasRevealedContent, revealGenStatus, onRevealRequest, onTriggerGeneration]);

  const handleConsentConfirm = useCallback(() => {
    setConsentOpen(false);
    setIsRevealed(true);
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoError(true);
  }, []);

  const handleTriggerGen = useCallback(async () => {
    if (!onTriggerGeneration) return;
    setIsLoading(true);
    try {
      await onTriggerGeneration();
    } finally {
      setIsLoading(false);
    }
  }, [onTriggerGeneration]);

  return (
    <>
      <div
        className={cn('relative overflow-hidden rounded-xl bg-muted', aspectRatio, className)}
        onClick={handleTap}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleTap()}
        aria-label="Tap to reveal"
      >
        {showRevealed && revealedVideoUrl ? (
          <video
            ref={videoRef}
            key={revealedVideoUrl}
            className="absolute inset-0 h-full w-full object-cover"
            src={revealedVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            onError={handleVideoError}
          />
        ) : showTeaser && teaserVideoUrl ? (
          <video
            key={teaserVideoUrl}
            className="absolute inset-0 h-full w-full object-cover"
            src={teaserVideoUrl}
            autoPlay
            loop
            muted
            playsInline
            onError={handleVideoError}
          />
        ) : (
          fallbackImageUrl && (
            <img
              src={fallbackImageUrl}
              alt={profileName}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )
        )}

        {(revealGenStatus === 'pending' || isLoading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          </div>
        )}

        {!showRevealed && canReveal && hasRevealedContent && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <p className="rounded-full bg-primary/80 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
              Tap to reveal
            </p>
          </div>
        )}

        {videoError && fallbackImageUrl && (
          <img
            src={fallbackImageUrl}
            alt={profileName}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm reveal
            </DialogTitle>
            <DialogDescription>
              You are about to view adult content from {profileName}. This content is intended for
              mature audiences. {creditsCost > 0 && `This will use ${creditsCost} credits.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConsentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConsentConfirm}>
              I confirm, show reveal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
