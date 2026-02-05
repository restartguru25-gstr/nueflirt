'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VideoRevealPlayer } from '@/components/video-reveal-player';
import { Button } from '@/components/ui/button';
import { Crown, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { User } from '@/types';
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { triggerRevealGeneration } from '@/lib/reveal-api';
import { REVEAL_CREDITS_COST } from '@/lib/limits';

export interface ProfileRevealDialogProps {
  profile: User;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether current user has premium. */
  isPremium: boolean;
  /** Current user's credit balance. */
  credits: number;
  /** Whether current user has explicit opt-in. */
  currentUserExplicitOptIn: boolean;
  /** Whether this is a match (mutual like). */
  isMatch?: boolean;
}

export function ProfileRevealDialog({
  profile,
  currentUserId,
  open,
  onOpenChange,
  isPremium,
  credits,
  currentUserExplicitOptIn,
  isMatch = false,
}: ProfileRevealDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const profileRef = useMemoFirebase(
    () => (firestore && profile?.id) ? doc(firestore, 'user_profiles', profile.id) : null,
    [firestore, profile?.id]
  );
  const { data: liveProfile } = useDoc<User>(profileRef);

  const profileOwnerExplicitOptIn = liveProfile?.explicitContentOptIn ?? profile?.explicitContentOptIn ?? false;
  const teaserUrl = liveProfile?.revealTeaserUrl ?? profile?.revealTeaserUrl ?? profile?.teaserVideoUrl;
  const revealedUrl = liveProfile?.revealedVideoUrl ?? profile?.revealedVideoUrl;
  const revealGenStatus = liveProfile?.revealGenStatus ?? profile?.revealGenStatus ?? 'idle';
  const photoUrl = profile?.images?.[0];

  const canReveal = (isPremium || credits >= REVEAL_CREDITS_COST) && currentUserExplicitOptIn && profileOwnerExplicitOptIn && (isMatch || true);
  const needsUpgrade = !isPremium && credits < REVEAL_CREDITS_COST;
  const needsOptIn = !currentUserExplicitOptIn || !profileOwnerExplicitOptIn;

  const handleRevealRequest = useCallback(() => {
    if (needsUpgrade) {
      toast({
        variant: 'destructive',
        title: 'Premium or credits required',
        description: `Viewing reveals costs ${REVEAL_CREDITS_COST} credits. Upgrade or earn more credits.`,
      });
      return;
    }
    if (needsOptIn) {
      toast({
        variant: 'destructive',
        title: 'Opt-in required',
        description: 'Both you and this profile must have explicit content enabled in settings.',
      });
      return;
    }
  }, [needsUpgrade, needsOptIn, toast]);

  const handleTriggerGeneration = useCallback(async () => {
    if (!photoUrl || !profileRef) return;
    try {
      await triggerRevealGeneration(photoUrl);
      toast({ title: 'Reveal generation started', description: 'This may take a minute. Refresh to check.' });
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Failed to start generation';
      toast({ variant: 'destructive', title: 'Could not start reveal', description: msg });
    }
  }, [photoUrl, profileRef, toast, onOpenChange]);

  const showRevealPlayer = canReveal || teaserUrl || revealedUrl;
  const isOwnProfile = profile?.id === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>{profile?.name}&apos;s Reveal</DialogTitle>
        </DialogHeader>
        <div className="p-4 pt-2 space-y-4">
          {showRevealPlayer && !isOwnProfile ? (
            <VideoRevealPlayer
              profileName={profile?.name ?? ''}
              fallbackImageUrl={profile?.images?.[0]}
              teaserVideoUrl={teaserUrl}
              revealedVideoUrl={revealedUrl}
              revealGenStatus={revealGenStatus}
              canReveal={canReveal}
              onRevealRequest={handleRevealRequest}
              onTriggerGeneration={isOwnProfile ? handleTriggerGeneration : undefined}
              creditsCost={REVEAL_CREDITS_COST}
              className="w-full"
            />
          ) : isOwnProfile ? (
            <div className="space-y-2">
              <VideoRevealPlayer
                profileName={profile?.name ?? ''}
                fallbackImageUrl={profile?.images?.[0]}
                teaserVideoUrl={teaserUrl}
                revealedVideoUrl={revealedUrl}
                revealGenStatus={revealGenStatus}
                canReveal={true}
                onTriggerGeneration={handleTriggerGeneration}
                creditsCost={0}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Generate your reveal video from your first profile photo. Requires ComfyUI/RunPod to be configured.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {needsUpgrade && (
                <>
                  <Crown className="h-12 w-12 text-primary mb-4" />
                  <p className="font-medium">Premium or credits required</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Unlock reveals with {REVEAL_CREDITS_COST} credits or upgrade to Premium.
                  </p>
                  <Button asChild>
                    <Link href="/subscribe">Upgrade</Link>
                  </Button>
                </>
              )}
              {needsOptIn && !needsUpgrade && (
                <>
                  <p className="font-medium">Opt-in required</p>
                  <p className="text-sm text-muted-foreground">
                    Enable explicit content in your profile settings to view reveals.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
