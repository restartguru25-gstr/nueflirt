'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { LibraryScreen } from '@/components/library-screen';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import type { LibraryVideo, LibrarySession } from '@/types';
import { purchaseLibraryPass, incrementLibraryView } from '@/lib/library-api';
import { useToast } from '@/hooks/use-toast';
import { Film } from 'lucide-react';
import type { Timestamp } from 'firebase/firestore';

function parseTimestamp(ts: unknown): number | null {
  if (!ts) return null;
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    return (ts as Timestamp).toDate().getTime();
  }
  if (typeof ts === 'number') return ts;
  return null;
}

export default function LibraryPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const usersRef = useMemoFirebase(
    () => (firestore && user) ? doc(firestore, 'users', user.uid) : null,
    [firestore, user]
  );
  const userProfileRef = useMemoFirebase(
    () => (firestore && user) ? doc(firestore, 'user_profiles', user.uid) : null,
    [firestore, user]
  );
  const subscriptionRef = useMemoFirebase(
    () => (firestore && user) ? doc(firestore, 'subscriptions', user.uid) : null,
    [firestore, user]
  );

  const videosQuery = useMemoFirebase(
    () => firestore ? query(collection(firestore, 'library_videos'), orderBy('popularity', 'desc')) : null,
    [firestore]
  );

  const { data: usersData } = useDoc<{ library_session?: LibrarySession; explicitContentOptIn?: boolean }>(usersRef);
  const { data: userProfile } = useDoc<{ explicitContentOptIn?: boolean; age?: number }>(userProfileRef);
  const { data: subscription } = useDoc<{ planType?: string }>(subscriptionRef);
  const { data: videos, isLoading: videosLoading } = useCollection<LibraryVideo>(videosQuery);

  const isPremium = subscription?.planType === 'premium';
  const sessionExpiryMs = useMemo(() => {
    if (isPremium) return null;
    const session = usersData?.library_session;
    if (!session?.expiry) return null;
    const exp = parseTimestamp(session.expiry);
    return exp ?? null;
  }, [usersData?.library_session, isPremium]);

  const canAccessFull = !!isPremium || !!(sessionExpiryMs != null && sessionExpiryMs > Date.now());

  const handlePurchasePass = useCallback(
    async (pass: { id: string; durationMinutes: number; priceInr: number }) => {
      if (!user) return;
      try {
        const result = await purchaseLibraryPass(pass as { id: string; label: string; durationMinutes: number; priceInr: number });
        if (!result.success) {
          toast({ variant: 'destructive', title: 'Purchase failed', description: result.error });
        }
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Purchase failed';
        toast({ variant: 'destructive', title: 'Error', description: msg });
        throw e;
      }
    },
    [user, toast]
  );

  const handleRenewClick = useCallback(() => {
    router.push('/subscribe?library=1');
  }, [router]);

  const handleViewTrack = useCallback((videoId: string) => {
    incrementLibraryView(videoId).catch(() => {});
  }, []);

  const explicitOptIn = usersData?.explicitContentOptIn ?? userProfile?.explicitContentOptIn;

  if (isUserLoading || !user) {
    return <AppLayout><div className="flex justify-center items-center h-full">Loading...</div></AppLayout>;
  }

  if (!explicitOptIn) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-2">Library Access</h1>
          <p className="text-muted-foreground mb-4">
            Enable &quot;Interactive Reveals&quot; in your profile Content Preferences to browse the video library.
          </p>
          <a href="/profile" className="text-primary underline font-medium">Go to Profile</a>
        </div>
      </AppLayout>
    );
  }

  const videosList = videos ?? [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Film className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold font-headline">Video Library</h1>
            <p className="text-muted-foreground">Curated reveal videos. Unlock with a time pass.</p>
          </div>
        </div>

        <LibraryScreen
          videos={videosList}
          isLoading={videosLoading}
          canAccessFull={canAccessFull}
          sessionExpiryMs={sessionExpiryMs}
          isPremium={!!isPremium}
          onPurchasePass={handlePurchasePass}
          onRenewClick={handleRenewClick}
          onViewTrack={handleViewTrack}
        />
      </div>
    </AppLayout>
  );
}
