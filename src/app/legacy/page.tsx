'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { AppLayout } from '@/components/app-layout';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, X, ShieldCheck, Lock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser, useCollection, useFirestore, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, addDoc, query, where, getDocs, serverTimestamp, Query, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getOverallCompatibilityScore } from '@/lib/zodiac';
import type { Like, Block } from '@/types';
import { DEFAULT_AGE_MIN, DEFAULT_AGE_MAX } from '@/lib/limits';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const LEGACY_STATUSES = ['married', 'widowed', 'divorced'];

function LegacyUserCard({
  user,
  currentUserProfile,
  anonymize,
  onLike,
  onDislike,
}: {
  user: User;
  currentUserProfile: User | null;
  anonymize: boolean;
  onLike: () => void;
  onDislike: () => void;
}) {
  const compatibilityScore = currentUserProfile ? getOverallCompatibilityScore(currentUserProfile, user) : null;
  const blurClass = anonymize ? 'blur-md select-none' : '';

  return (
    <motion.div
      className="absolute h-full w-full"
      initial={{ scale: 0.9, y: 20, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0, transition: { duration: 0.3 } }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      onDragEnd={(_, { offset }) => {
        if (offset.x > 150) onLike();
        else if (offset.x < -150) onDislike();
      }}
    >
      <Card className="relative h-full w-full overflow-hidden shadow-2xl shadow-primary/10">
        {user.teaserVideoUrl ? (
          <video key={user.teaserVideoUrl} className={cn('absolute top-0 left-0 h-full w-full object-cover', blurClass)} autoPlay loop muted playsInline>
            <source src={user.teaserVideoUrl} type="video/mp4" />
          </video>
        ) : (
          user.images?.[0] && (
            <img src={user.images[0]} alt="" className={cn('absolute top-0 left-0 h-full w-full object-cover', blurClass)} />
          )
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <CardContent className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2">
            <h3 className={cn('text-3xl font-bold font-headline', blurClass)}>{user.name}, {user.age}</h3>
            {user.isVerified && <ShieldCheck className="w-7 h-7 text-green-400 flex-shrink-0" />}
          </div>
          <p className={cn('text-sm opacity-90 mt-1', blurClass)}>{user.location}</p>
          <p className={cn('mt-2 text-base line-clamp-2', blurClass)}>{user.bio}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {user.interests?.slice(0, 3).map(interest => (
              <Badge key={interest} variant="secondary" className="bg-white/20 text-white backdrop-blur-sm border-none">{interest}</Badge>
            ))}
            {compatibilityScore != null && compatibilityScore >= 50 && (
              <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm border-none">{compatibilityScore}% match</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function LegacyPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [userStack, setUserStack] = useState<User[]>([]);

  const currentUserProfileRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'user_profiles', user.uid) : null, [firestore, user]);
  const { data: currentUserProfile, isLoading: isCurrentUserProfileLoading } = useDoc<User>(currentUserProfileRef);
  const subscriptionRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'subscriptions', user.uid) : null, [firestore, user]);
  const { data: subscription } = useDoc<{ planType?: string }>(subscriptionRef);

  const blocksQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'blocks'), where('blockerId', '==', user.uid)) : null, [firestore, user]);
  const { data: blocks } = useCollection<Block>(blocksQuery);
  const blockedIds = useMemo(() => new Set((blocks ?? []).map(b => b.blockedId)), [blocks]);

  const profilesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'user_profiles'),
      where('relationshipStatus', 'in', LEGACY_STATUSES),
      where('legacyModeOptIn', '==', true)
    );
  }, [firestore]);

  const { data: liveProfiles, isLoading: profilesLoading } = useCollection<User>(profilesQuery as Query);

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/login');
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!liveProfiles || !user) {
      setUserStack([]);
      return;
    }
    const ageMin = currentUserProfile?.ageRangeMin ?? DEFAULT_AGE_MIN;
    const ageMax = currentUserProfile?.ageRangeMax ?? DEFAULT_AGE_MAX;
    const filtered = liveProfiles.filter(
      p => p.id !== user.uid && !blockedIds.has(p.id) && p.age >= ageMin && p.age <= ageMax
    );
    setUserStack(filtered);
  }, [liveProfiles, user, currentUserProfile, blockedIds]);

  const handleAction = async (direction: 'like' | 'dislike') => {
    if (userStack.length === 0 || !user || !firestore) return;
    const topUser = userStack[userStack.length - 1];
    setUserStack(prev => prev.slice(0, prev.length - 1));

    if (direction === 'dislike') return;

    try {
      await addDoc(collection(firestore, 'likes'), {
        swiperId: user.uid,
        swipedId: topUser.id,
        createdAt: serverTimestamp(),
        type: 'like',
      });
      const q = query(
        collection(firestore, 'likes'),
        where('swiperId', '==', topUser.id),
        where('swipedId', '==', user.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await addDoc(collection(firestore, 'matches'), {
          user1Id: user.uid,
          user2Id: topUser.id,
          matchedAt: serverTimestamp(),
        });
        toast({ title: "It's a match!" });
      } else {
        toast({ title: 'Like sent' });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not send like.' });
      setUserStack(prev => [...prev, topUser]);
    }
  };

  const isPremium = subscription?.planType === 'premium';
  const canAccess = currentUserProfile && LEGACY_STATUSES.includes(currentUserProfile.relationshipStatus ?? '') && currentUserProfile.legacyModeOptIn;
  const isLoading = isUserLoading || isCurrentUserProfileLoading || profilesLoading;

  if (isLoading && userStack.length === 0) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">Loading Legacy pool...</div>
      </AppLayout>
    );
  }

  if (!isPremium) {
    return (
      <AppLayout>
        <Card className="max-w-md mx-auto mt-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Lock className="h-12 w-12 text-primary" />
              <h2 className="text-xl font-semibold">Discreet Legacy Mode</h2>
              <p className="text-sm text-muted-foreground">
                This private pool is for Premium members with relationship status Married, Widowed, or Divorced.
              </p>
              <Link href="/subscribe"><Button>Upgrade to Premium</Button></Link>
              <Link href="/profile"><Button variant="outline">Edit profile & status</Button></Link>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (!canAccess) {
    return (
      <AppLayout>
        <Card className="max-w-md mx-auto mt-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <ShieldCheck className="h-12 w-12 text-primary" />
              <h2 className="text-xl font-semibold">Legacy Mode</h2>
              <p className="text-sm text-muted-foreground">
                Set your relationship status to Married, Widowed, or Divorced in Profile and enable Legacy Mode to see this pool.
              </p>
              <Link href="/profile"><Button>Go to Profile</Button></Link>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const topUser = userStack[userStack.length - 1];

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-10rem)]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Discreet Legacy</h1>
          <Label className="text-sm text-muted-foreground">Private pool · Premium</Label>
        </div>
        <div className="relative flex-1 min-h-0">
          {topUser ? (
            <AnimatePresence mode="wait">
              <LegacyUserCard
                key={topUser.id}
                user={topUser}
                currentUserProfile={currentUserProfile ?? null}
                anonymize={topUser.legacyAnonymizeAvatar ?? false}
                onLike={() => handleAction('like')}
                onDislike={() => handleAction('dislike')}
              />
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <p>No more profiles in the Legacy pool right now.</p>
              <Link href="/dashboard"><Button variant="outline" className="mt-4">Back to Discover</Button></Link>
            </div>
          )}
        </div>
        {topUser && (
          <div className="flex justify-center gap-4 p-4 border-t">
            <Button size="icon" variant="destructive" className="h-14 w-14 rounded-full" onClick={() => handleAction('dislike')}>
              <X className="h-7 w-7" />
            </Button>
            <Button size="icon" className="h-14 w-14 rounded-full" onClick={() => handleAction('like')}>
              <Heart className="h-7 w-7" />
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
