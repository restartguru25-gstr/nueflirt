'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/app-layout';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, X, Zap, Coins, Filter } from 'lucide-react';
import { useUser, useCollection, useFirestore, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, addDoc, query, where, getDocs, serverTimestamp, Query, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getOverallCompatibilityScore } from '@/lib/zodiac';
import type { Like, Block } from '@/types';
import { DEFAULT_AGE_MIN, DEFAULT_AGE_MAX } from '@/lib/limits';
import { vibeFilterOptions } from '@/lib/profile-options';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const SITUATIONSHIP_EXPIRY_DAYS = 7;
const EXTEND_MATCH_CREDITS = 5;

function VibesVideoCard({
  user,
  currentUserProfile,
  onLike,
  onPass,
}: {
  user: User;
  currentUserProfile: User | null;
  onLike: () => void;
  onPass: () => void;
}) {
  const score = currentUserProfile ? getOverallCompatibilityScore(currentUserProfile, user) : null;
  return (
    <Card className="overflow-hidden flex-shrink-0 w-[280px] md:w-[320px] snap-center">
      <div className="relative aspect-[9/16] bg-muted">
        {user.teaserVideoUrl ? (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src={user.teaserVideoUrl}
            muted
            loop
            playsInline
            autoPlay
          />
        ) : (
          <Avatar className="w-full h-full rounded-none">
            <AvatarImage src={user.images?.[0]} className="object-cover" />
            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
          </Avatar>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-bold text-lg">{user.name}, {user.age}</h3>
          <p className="text-sm opacity-90 truncate">{user.bio || user.location}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {user.interests?.slice(0, 2).map(i => <Badge key={i} variant="secondary" className="text-xs bg-white/20 border-none">{i}</Badge>)}
            {score != null && score >= 50 && <Badge variant="secondary" className="text-xs bg-primary/80">{score}%</Badge>}
          </div>
        </div>
      </div>
      <CardContent className="p-2 flex gap-2">
        <Button size="sm" variant="destructive" className="flex-1" onClick={onPass}><X className="h-4 w-4" /></Button>
        <Button size="sm" className="flex-1" onClick={onLike}><Heart className="h-4 w-4" /></Button>
      </CardContent>
    </Card>
  );
}

export default function VibesPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [vibeFilter, setVibeFilter] = useState<string>('');
  const [profilesList, setProfilesList] = useState<User[]>([]);
  const [index, setIndex] = useState(0);

  const currentUserProfileRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'user_profiles', user.uid) : null, [firestore, user]);
  const { data: currentUserProfile, isLoading: isCurrentUserProfileLoading } = useDoc<User>(currentUserProfileRef);
  const creditBalanceRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'credit_balances', user.uid) : null, [firestore, user]);
  const { data: creditBalance } = useDoc<{ balance: number }>(creditBalanceRef);

  const blocksQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'blocks'), where('blockerId', '==', user.uid)) : null, [firestore, user]);
  const { data: blocks } = useCollection<Block>(blocksQuery);
  const blockedIds = useMemo(() => new Set((blocks ?? []).map(b => b.blockedId)), [blocks]);

  const profilesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'user_profiles'),
      where('relationshipStatus', '==', 'situationship')
    );
  }, [firestore]);

  const { data: liveProfiles, isLoading: profilesLoading } = useCollection<User>(profilesQuery as Query);

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/login');
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!liveProfiles || !user) {
      setProfilesList([]);
      setIndex(0);
      return;
    }
    const ageMin = currentUserProfile?.ageRangeMin ?? DEFAULT_AGE_MIN;
    const ageMax = currentUserProfile?.ageRangeMax ?? DEFAULT_AGE_MAX;
    let filtered = liveProfiles.filter(
      p => p.id !== user.uid && !blockedIds.has(p.id) && p.age >= ageMin && p.age <= ageMax
    );
    if (vibeFilter) {
      filtered = filtered.filter(p => (p.vibeFilters ?? []).includes(vibeFilter));
    }
    setProfilesList(filtered);
    setIndex(0);
  }, [liveProfiles, user, currentUserProfile, blockedIds, vibeFilter]);

  const currentUser = profilesList[index];

  const handleLike = async () => {
    if (!currentUser || !user || !firestore) return;
    try {
      await addDoc(collection(firestore, 'likes'), {
        swiperId: user.uid,
        swipedId: currentUser.id,
        createdAt: serverTimestamp(),
        type: 'like',
      });
      const q = query(
        collection(firestore, 'likes'),
        where('swiperId', '==', currentUser.id),
        where('swipedId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + SITUATIONSHIP_EXPIRY_DAYS);
      if (!snap.empty) {
        await addDoc(collection(firestore, 'matches'), {
          user1Id: user.uid,
          user2Id: currentUser.id,
          matchedAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(expiresAt),
        });
        toast({ title: "It's a match! (Expires in 7 days)" });
      } else {
        toast({ title: 'Like sent' });
      }
      setIndex(prev => Math.min(prev + 1, profilesList.length - 1));
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error' });
    }
  };

  const handlePass = () => {
    setIndex(prev => Math.min(prev + 1, profilesList.length));
  };

  const saveVibeFilters = () => {
    if (!firestore || !user) return;
    const current = currentUserProfile?.vibeFilters ?? [];
    const next = vibeFilter ? (current.includes(vibeFilter) ? current : [...current, vibeFilter]) : current;
    const userProfileRef = doc(firestore, 'user_profiles', user.uid);
    setDocumentNonBlocking(userProfileRef, { vibeFilters: next }, { merge: true });
    toast({ title: 'Vibe filters saved' });
  };

  const isSituationship = currentUserProfile?.relationshipStatus === 'situationship';
  const isLoading = isUserLoading || isCurrentUserProfileLoading || profilesLoading;
  const vibePoints = currentUserProfile?.vibePoints ?? 0;
  const credits = creditBalance?.balance ?? 0;

  if (isLoading && profilesList.length === 0) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">Loading Fluid Vibes...</div>
      </AppLayout>
    );
  }

  if (!isSituationship) {
    return (
      <AppLayout>
        <Card className="max-w-md mx-auto mt-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Zap className="h-12 w-12 text-primary" />
              <h2 className="text-xl font-semibold">Fluid Vibes Zone</h2>
              <p className="text-sm text-muted-foreground">
                Set your relationship status to Situationship in Profile to browse this zone.
              </p>
              <Link href="/profile"><Button>Go to Profile</Button></Link>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h1 className="text-xl font-bold">Fluid Vibes Zone</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1"><Zap className="h-3 w-3" /> {vibePoints} pts</Badge>
            <Badge variant="outline" className="gap-1"><Coins className="h-3 w-3" /> {credits}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-2 mb-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-thin">
            <Button variant={vibeFilter === '' ? 'default' : 'outline'} size="sm" onClick={() => setVibeFilter('')}>All</Button>
            {vibeFilterOptions.map(v => (
              <Button key={v} variant={vibeFilter === v ? 'default' : 'outline'} size="sm" onClick={() => setVibeFilter(v)}>{v}</Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={saveVibeFilters}>Save my vibe</Button>
        </div>
        <p className="text-xs text-muted-foreground mb-2">Matches here expire in 7 days. Use credits to extend.</p>
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          {currentUser ? (
            <div className="flex justify-center p-4">
              <VibesVideoCard
                user={currentUser}
                currentUserProfile={currentUserProfile}
                onLike={handleLike}
                onPass={handlePass}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <p>No more profiles in Fluid Vibes right now.</p>
              <Link href="/dashboard"><Button variant="outline" className="mt-4">Discover</Button></Link>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
