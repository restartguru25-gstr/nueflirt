'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { AppLayout } from '@/components/app-layout';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Star, X, Filter, Sparkles, ShieldCheck, RefreshCcw, Flower2, Eye } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser, useCollection, useFirestore, useMemoFirebase, useDoc, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { useRouter } from 'next/navigation';
import { collection, addDoc, query, where, getDocs, serverTimestamp, Query, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { dummyProfiles } from '@/lib/dummy-profiles';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { indianLanguages as languages, indianRegions as regions, indianCommunities as communities, datingIntents as intents, casteOptions as casteOpts } from '@/lib/profile-options';
import { useLocale } from '@/contexts/locale-context';
import { useOfflineProfiles } from '@/hooks/use-offline';
import { distanceKm, DISTANCE_OPTIONS_KM } from '@/lib/geo';
import { getCompatibilityScore, getZodiacMatchTagline, getOverallCompatibilityScore } from '@/lib/zodiac';
import type { Like, Block } from '@/types';
import { DAILY_LIKE_LIMIT_FREE, DAILY_SUPER_LIKE_LIMIT_FREE, ROSE_CREDITS_COST, DEFAULT_AGE_MIN, DEFAULT_AGE_MAX } from '@/lib/limits';
import { ProfileRevealDialog } from '@/components/profile-reveal-dialog';

const indianLanguages = ["Any", ...languages];
const indianRegions = ["Any", ...regions];
const indianCommunities = ["Any", ...communities];
const casteOptionsList = casteOpts;
const datingIntents = ["Any", ...intents];


function UserCard({ user, currentUserProfile, onLike, onDislike, onRevealClick, exitDirection = 0, stackIndex = 0 }: { user: User; currentUserProfile?: User | null; onLike: () => void; onDislike: () => void; onRevealClick?: () => void; exitDirection?: number; stackIndex?: number }) {
  const zodiacTagline = user.zodiac ? getZodiacMatchTagline(user.zodiac) : null;
  const compatibilityScore = currentUserProfile ? getOverallCompatibilityScore(currentUserProfile, user) : null;
  const hasRevealContent = !!(user.revealTeaserUrl || user.teaserVideoUrl || user.revealedVideoUrl) || (user.explicitContentOptIn && user.images?.[0]);
  return (
    <motion.div
      className="absolute inset-0 h-full w-full"
      style={{ zIndex: stackIndex }}
      initial={{ scale: 0.92, y: 24, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{
        x: exitDirection * 420,
        opacity: 0,
        scale: 0.92,
        transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
      }}
      transition={{ type: 'spring', stiffness: 120, damping: 24 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={(_, { offset, velocity }) => {
        if (offset.x > 120 || velocity.x > 200) onLike();
        else if (offset.x < -120 || velocity.x < -200) onDislike();
      }}
    >
      <Card className="relative h-full w-full overflow-hidden shadow-card hover:shadow-glow-primary transition-shadow duration-300 rounded-2xl">
        {hasRevealContent && onRevealClick && (
          <button
            type="button"
            className="absolute top-3 right-3 z-20 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRevealClick(); }}
            aria-label="View reveal"
          >
            <Eye className="h-5 w-5" />
          </button>
        )}
        {(user.revealTeaserUrl || user.teaserVideoUrl) ? (
          <video key={user.revealTeaserUrl || user.teaserVideoUrl} className="absolute top-0 left-0 h-full w-full object-cover" autoPlay loop muted playsInline>
            <source src={user.revealTeaserUrl || user.teaserVideoUrl} type="video/mp4" />
          </video>
        ) : (
          user.images?.[0] && <img src={user.images[0]} alt={user.name} className="absolute top-0 left-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <CardContent className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-3xl font-bold font-headline">{user.name}, {user.age}</h3>
            {user.isVerified && <ShieldCheck className="w-7 h-7 text-green-400" />}
            {user.datingIntent && (
              <Badge variant="secondary" className="bg-primary/30 text-white backdrop-blur-sm border-primary/50 shrink-0 text-xs">
                {user.datingIntent}
              </Badge>
            )}
          </div>
          <p className="text-sm opacity-90 mt-1">{user.location}</p>
          <p className="mt-2 text-base line-clamp-2">{user.bio}</p>
          
          <div className="flex flex-wrap gap-2 mt-4">
            {user.interests?.slice(0, 3).map(interest => <Badge key={interest} variant="secondary" className="bg-white/20 text-white backdrop-blur-sm border-none">{interest}</Badge>)}
            {user.zodiac && <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm border-none">{user.zodiac}</Badge>}
            {compatibilityScore != null && compatibilityScore >= 50 && (
              <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm border-none">{compatibilityScore}% match</Badge>
            )}
            {user.pets && <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm border-none">{user.pets}</Badge>}
          </div>
          {zodiacTagline && <p className="text-xs opacity-80 mt-1">{zodiacTagline}</p>}

          {user.promptAnswers && user.promptAnswers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20">
                <p className="font-semibold text-sm">{user.promptAnswers[0].prompt}</p>
                <p className="mt-1 text-base opacity-90 line-clamp-2">{user.promptAnswers[0].answer}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useLocale();

  const [filters, setFilters] = useState({ language: 'Any', region: 'Any', community: 'Any', caste: 'Any', datingIntent: 'Any', distanceKm: 0 as number });
  const [showFilters, setShowFilters] = useState(false);
  const [smartSort, setSmartSort] = useState(false);
  const [userStack, setUserStack] = useState<User[]>([]);
  const [exitDirection, setExitDirection] = useState(0); // -1 left, 0 none, 1 right
  const [lastDislikedProfile, setLastDislikedProfile] = useState<User | null>(null);
  const [newMatch, setNewMatch] = useState<User | null>(null);
  const [revealProfile, setRevealProfile] = useState<User | null>(null);

  const currentUserProfileRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'user_profiles', user.uid) : null, [firestore, user]);
  const currentUserDataRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: currentUserProfile, isLoading: isCurrentUserProfileLoading } = useDoc<User>(currentUserProfileRef);
  const { data: currentUserData } = useDoc<{ explicitContentOptIn?: boolean }>(currentUserDataRef);
  const oauthProfileCreatedRef = useRef(false);

  const subscriptionRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'subscriptions', user.uid) : null, [firestore, user]);
  const { data: subscription } = useDoc<any>(subscriptionRef);
  const isPremium = subscription?.planType === 'premium';

  const creditBalanceRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'credit_balances', user.uid) : null, [firestore, user]);
  const { data: creditBalance } = useDoc<{ balance: number }>(creditBalanceRef);

  const myLikesQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'likes'), where('swiperId', '==', user.uid)) : null, [firestore, user]);
  const { data: myLikes } = useCollection<Like>(myLikesQuery);

  const blocksQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'blocks'), where('blockerId', '==', user.uid)) : null, [firestore, user]);
  const { data: blocks } = useCollection<Block>(blocksQuery);
  const blockedIds = useMemo(() => new Set((blocks ?? []).map(b => b.blockedId)), [blocks]);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const { todayLikesCount, todaySuperLikesCount } = useMemo(() => {
    let likes = 0;
    let superLikes = 0;
    if (myLikes) {
      for (const l of myLikes) {
        const t = l.createdAt?.toDate?.();
        if (!t || t.getTime() < todayStart) continue;
        if (l.type === 'super_like') superLikes++;
        else if (l.type === 'rose') { /* roses don't count toward like limit */ }
        else likes++;
      }
    }
    return { todayLikesCount: likes, todaySuperLikesCount: superLikes };
  }, [myLikes, todayStart]);

  // Create minimal profile for OAuth users who don't have user_profiles yet
  useEffect(() => {
    if (!firestore || !user || currentUserProfile || isCurrentUserProfileLoading || oauthProfileCreatedRef.current) return;
    oauthProfileCreatedRef.current = true;
    const name = user.displayName || user.email?.split('@')[0] || 'User';
    const photo = user.photoURL ? [user.photoURL] : [];
    const userProfileData = {
      id: user.uid,
      userId: user.uid,
      name,
      age: 0,
      gender: '',
      preferences: '',
      location: '',
      bio: '',
      interests: [],
      images: photo,
      avatarId: '',
      language: '',
      region: '',
      community: '',
      datingIntent: '',
      promptAnswers: [],
    };
    setDocumentNonBlocking(doc(firestore, 'user_profiles', user.uid), userProfileData, { merge: true });
    setDocumentNonBlocking(doc(firestore, 'subscriptions', user.uid), { userId: user.uid, planType: 'free', startDate: new Date(), endDate: null }, { merge: true });
    setDocumentNonBlocking(doc(firestore, 'credit_balances', user.uid), { userId: user.uid, balance: 10 }, { merge: true });
  }, [firestore, user, currentUserProfile, isCurrentUserProfileLoading]);

  const profilesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    let q: Query = collection(firestore, 'user_profiles');
    const queryConstraints = [];
    if (filters.language !== 'Any') queryConstraints.push(where('language', '==', filters.language));
    if (filters.region !== 'Any') queryConstraints.push(where('region', '==', filters.region));
    if (filters.community !== 'Any') queryConstraints.push(where('community', '==', filters.community));
    if (filters.caste !== 'Any') queryConstraints.push(where('caste', '==', filters.caste));
    if (filters.datingIntent !== 'Any') queryConstraints.push(where('datingIntent', '==', filters.datingIntent));
    
    if(queryConstraints.length > 0) q = query(q, ...queryConstraints);
    
    return q;
  }, [firestore, filters]);

  const { data: liveProfiles, isLoading: profilesLoading } = useCollection<User>(profilesQuery as Query);
  const { data: allProfiles, isLoading: profilesLoadingFinal, isOffline } = useOfflineProfiles(liveProfiles, profilesLoading);

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/login');
  }, [user, isUserLoading, router]);

  useEffect(() => {
    let potentialMatches: User[] = [];
    if (allProfiles) {
      potentialMatches = allProfiles.filter(p => p.id !== user?.uid && !blockedIds.has(p.id));
    }

    const existingProfileIds = new Set(potentialMatches.map(p => p.id));
    if(user) {
      existingProfileIds.add(user.uid);
    }

    const filteredDummyProfiles = dummyProfiles.filter(p => {
        if (existingProfileIds.has(p.id) || blockedIds.has(p.id)) return false;
        const langMatch = filters.language === 'Any' || p.language === filters.language;
        const regionMatch = filters.region === 'Any' || p.region === filters.region;
        const communityMatch = filters.community === 'Any' || p.community === filters.community;
        const casteMatch = filters.caste === 'Any' || (p as User).caste === filters.caste;
        const intentMatch = filters.datingIntent === 'Any' || p.datingIntent === filters.datingIntent;
        return langMatch && regionMatch && communityMatch && casteMatch && intentMatch;
    });

    potentialMatches = [...potentialMatches, ...filteredDummyProfiles];

    const ageMin = currentUserProfile?.ageRangeMin ?? DEFAULT_AGE_MIN;
    const ageMax = currentUserProfile?.ageRangeMax ?? DEFAULT_AGE_MAX;
    potentialMatches = potentialMatches.filter((p) => p.age >= ageMin && p.age <= ageMax);

    // Filter and sort by distance when user has GPS and distance filter is set
    const myLat = currentUserProfile?.latitude;
    const myLon = currentUserProfile?.longitude;
    const maxKm = filters.distanceKm || 0;
    if (myLat != null && myLon != null && maxKm > 0) {
      potentialMatches = potentialMatches.filter((p) => {
        const plat = p.latitude;
        const plon = p.longitude;
        if (plat == null || plon == null) return true; // show profiles without GPS
        return distanceKm(myLat, myLon, plat, plon) <= maxKm;
      });
      potentialMatches.sort((a, b) => {
        const aLat = a.latitude; const aLon = a.longitude;
        const bLat = b.latitude; const bLon = b.longitude;
        if (aLat == null || aLon == null) return 1;
        if (bLat == null || bLon == null) return -1;
        return distanceKm(myLat!, myLon!, aLat, aLon) - distanceKm(myLat!, myLon!, bLat, bLon);
      });
    }

    // Sort by boosted status first, then by smart sort if enabled
    potentialMatches.sort((a, b) => {
      const aIsBoosted = a.boostedUntil && a.boostedUntil.toDate() > new Date();
      const bIsBoosted = b.boostedUntil && b.boostedUntil.toDate() > new Date();
      
      if (aIsBoosted && !bIsBoosted) return -1;
      if (!aIsBoosted && bIsBoosted) return 1;

      if (smartSort && currentUserProfile) {
        const interestsA = a.interests || [];
        const interestsB = b.interests || [];
        const currentUserInterests = new Set(currentUserProfile.interests || []);
        const commonA = interestsA.filter(i => currentUserInterests.has(i)).length;
        const commonB = interestsB.filter(i => currentUserInterests.has(i)).length;
        return commonB - commonA; // Sort descending by common interests
      }

      return 0;
    });

    setUserStack(potentialMatches);
  }, [allProfiles, user, profilesLoadingFinal, filters, smartSort, currentUserProfile, blockedIds]);

  const handleAction = async (direction: 'like' | 'dislike', likeType?: 'like' | 'super_like' | 'rose') => {
    if (userStack.length === 0 || !user || !firestore) return;
    const topUser = userStack[userStack.length - 1];

    if (direction === 'dislike') {
      setExitDirection(-1);
      setTimeout(() => {
        setUserStack(prev => prev.slice(0, prev.length - 1));
        setExitDirection(0);
        setLastDislikedProfile(topUser);
      }, 380);
      return;
    }

    const effectiveType = likeType ?? 'like';
    if (effectiveType === 'rose') {
      const balance = creditBalance?.balance ?? 0;
      if (balance < ROSE_CREDITS_COST) {
        toast({ variant: 'destructive', title: t('dashboard.noCredits'), description: t('dashboard.roseNeedsCredits') });
        return;
      }
    } else if (!isPremium) {
      if (effectiveType === 'super_like' && todaySuperLikesCount >= DAILY_SUPER_LIKE_LIMIT_FREE) {
        toast({ variant: 'destructive', title: t('dashboard.superLikeLimit'), description: t('dashboard.superLikeLimitDesc') });
        return;
      }
      if (effectiveType === 'like' && todayLikesCount >= DAILY_LIKE_LIMIT_FREE) {
        toast({ variant: 'destructive', title: t('dashboard.likeLimit'), description: t('dashboard.likeLimitDesc') });
        return;
      }
    }

    setExitDirection(1);
    setTimeout(async () => {
      setUserStack(prev => prev.slice(0, prev.length - 1));
      setExitDirection(0);
      try {
        const likesRef = collection(firestore, 'likes');
        await addDoc(likesRef, { swiperId: user.uid, swipedId: topUser.id, createdAt: serverTimestamp(), type: effectiveType });
        if (effectiveType === 'rose' && creditBalanceRef) {
          await updateDoc(creditBalanceRef, { balance: Math.max(0, (creditBalance?.balance ?? 0) - ROSE_CREDITS_COST) });
        }
        const q = query(likesRef, where('swiperId', '==', topUser.id), where('swipedId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const isSituationship = currentUserProfile?.relationshipStatus === 'situationship' || topUser.relationshipStatus === 'situationship';
          const matchData: { user1Id: string; user2Id: string; matchedAt: any; expiresAt?: any } = {
            user1Id: user.uid,
            user2Id: topUser.id,
            matchedAt: serverTimestamp(),
          };
          if (isSituationship) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            matchData.expiresAt = Timestamp.fromDate(expiresAt);
          }
          await addDoc(collection(firestore, 'matches'), matchData);
          setNewMatch(topUser);
        }
      } catch (e) {
        console.error("Error liking user: ", e);
        toast({ variant: 'destructive', title: t('dashboard.likeError'), description: t('dashboard.likeErrorDesc') });
        setUserStack(prev => [...prev, topUser]);
      }
    }, 380);
  };

  const handleRewind = () => {
    if (!isPremium) {
      toast({ title: t('dashboard.premiumRewind'), description: t('dashboard.premiumRewindDesc'), variant: "destructive" });
      return;
    }
    if (lastDislikedProfile) {
      setUserStack(prev => [...prev, lastDislikedProfile]);
      setLastDislikedProfile(null);
    }
  };
  
  const isLoading = isUserLoading || profilesLoadingFinal || isCurrentUserProfileLoading;

  if (isLoading && userStack.length === 0) {
      return <AppLayout><div className="flex justify-center items-center h-full">{t('dashboard.loadingProfiles')}</div></AppLayout>
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)]">
        {isOffline && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">You&apos;re viewing cached profiles. New data when back online.</p>
        )}
        <div className='flex justify-between items-center mb-4 flex-wrap gap-2'>
            <div className="flex items-center space-x-2">
                <Switch id="smart-sort" checked={smartSort} onCheckedChange={setSmartSort} />
                <Label htmlFor="smart-sort" className="flex items-center gap-1">
                    {t('dashboard.smartSort')} <Sparkles className="w-4 h-4 text-primary" />
                </Label>
            </div>
            {!isPremium && (
              <p className="text-sm text-muted-foreground">
                {t('dashboard.likesLeft', { count: Math.max(0, DAILY_LIKE_LIMIT_FREE - todayLikesCount) })}
                {DAILY_SUPER_LIKE_LIMIT_FREE - todaySuperLikesCount > 0 && ` · ${t('dashboard.superLikeLeft')}`}
              </p>
            )}
            <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                    <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> {t('dashboard.filters')}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">{t('dashboard.filterProfiles')}</h4>
                        <p className="text-sm text-muted-foreground">{t('dashboard.filterSubtitle')}</p>
                    </div>
                    <div className="grid gap-2">
                         <div className="grid grid-cols-3 items-center gap-4">
                            <Label>{t('dashboard.lookingFor')}</Label>
                            <Select value={filters.datingIntent} onValueChange={(v) => setFilters(f => ({...f, datingIntent: v}))}><SelectTrigger className="col-span-2 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>{datingIntents.map(i => <SelectItem key={i} value={i}>{i === 'Figuring it out' ? t('dashboard.figuringItOut') : i}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label>{t('dashboard.language')}</Label>
                            <Select value={filters.language} onValueChange={(v) => setFilters(f => ({...f, language: v}))}><SelectTrigger className="col-span-2 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>{indianLanguages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label>{t('dashboard.region')}</Label>
                            <Select value={filters.region} onValueChange={(v) => setFilters(f => ({...f, region: v}))}><SelectTrigger className="col-span-2 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>{indianRegions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                         <div className="grid grid-cols-3 items-center gap-4">
                            <Label>{t('dashboard.community')}</Label>
                             <Select value={filters.community} onValueChange={(v) => setFilters(f => ({...f, community: v}))}><SelectTrigger className="col-span-2 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>{indianCommunities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label>{t('dashboard.caste')}</Label>
                            <Select value={filters.caste} onValueChange={(v) => setFilters(f => ({...f, caste: v}))}><SelectTrigger className="col-span-2 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>{casteOptionsList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label>{t('dashboard.distance')}</Label>
                            <Select value={String(filters.distanceKm)} onValueChange={(v) => setFilters(f => ({...f, distanceKm: Number(v)}))}><SelectTrigger className="col-span-2 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">{t('common.any')}</SelectItem>
                                    {DISTANCE_OPTIONS_KM.filter(k => k > 0).map(k => <SelectItem key={k} value={String(k)}>{t('dashboard.withinKm', { km: k })}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
        <div className="relative flex-grow w-full max-w-sm mx-auto">
          {userStack.length > 0 ? (
            <AnimatePresence>
              {userStack.map((u, i) => (
                <UserCard
                  key={u.id}
                  user={u}
                  currentUserProfile={currentUserProfile}
                  onLike={() => handleAction('like')}
                  onDislike={() => handleAction('dislike')}
                  onRevealClick={() => setRevealProfile(u)}
                  exitDirection={i === userStack.length - 1 ? exitDirection : 0}
                  stackIndex={i}
                />
              ))}
            </AnimatePresence>
          ) : (
            <Card className="h-full w-full flex items-center justify-center bg-secondary">
                <div className="text-center text-muted-foreground p-4">
                    <p>{t('dashboard.noMoreProfiles')}</p>
                    <p className="text-sm">{t('dashboard.adjustFilters')}</p>
                </div>
            </Card>
          )}
        </div>

        <div className="flex justify-center items-center gap-2 sm:gap-4 mt-8 flex-wrap">
          <motion.div whileTap={{ scale: 0.88 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <Button variant="outline" size="icon" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-500 text-amber-500 hover:bg-amber-100 active:scale-95 transition-shadow" onClick={() => handleAction('dislike')} disabled={userStack.length === 0} title={t('dashboard.dislike')}><X className="w-7 h-7 sm:w-8 sm:h-8" /></Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.88 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <Button variant="outline" size="icon" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-blue-500 text-blue-500 hover:bg-blue-100" onClick={handleRewind} disabled={!lastDislikedProfile} title={t('dashboard.rewind')}><RefreshCcw className="w-7 h-7 sm:w-8 sm:h-8" /></Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.88 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <Button variant="outline" size="icon" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-purple-500 text-purple-500 hover:bg-purple-100" onClick={() => handleAction('like', 'super_like')} disabled={userStack.length === 0 || (!isPremium && todaySuperLikesCount >= DAILY_SUPER_LIKE_LIMIT_FREE)} title={t('dashboard.superLike')}><Star className="w-7 h-7 sm:w-8 sm:h-8" /></Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <Button variant="outline" size="icon" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-primary text-primary hover:bg-primary/10 shadow-card" onClick={() => handleAction('like')} disabled={userStack.length === 0 || (!isPremium && todayLikesCount >= DAILY_LIKE_LIMIT_FREE)} title={t('dashboard.like')}><Heart className="w-8 h-8 sm:w-10 sm:h-10" /></Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.88 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <Button variant="outline" size="icon" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-pink-500 text-pink-500 hover:bg-pink-100" onClick={() => handleAction('like', 'rose')} disabled={userStack.length === 0 || (creditBalance?.balance ?? 0) < ROSE_CREDITS_COST} title={t('dashboard.rose')}><Flower2 className="w-7 h-7 sm:w-8 sm:h-8" /></Button>
          </motion.div>
        </div>
        {!isPremium && (creditBalance?.balance ?? 0) >= ROSE_CREDITS_COST && <p className="text-xs text-center text-muted-foreground mt-2">{t('dashboard.credits', { count: creditBalance?.balance ?? 0 })}</p>}
      </div>
      
      {revealProfile && user && currentUserProfile && (
        <ProfileRevealDialog
          profile={revealProfile}
          currentUserId={user.uid}
          open={!!revealProfile}
          onOpenChange={(open) => !open && setRevealProfile(null)}
          isPremium={!!subscription?.planType && subscription.planType === 'premium'}
          credits={creditBalance?.balance ?? 0}
          currentUserExplicitOptIn={!!(currentUserData?.explicitContentOptIn ?? currentUserProfile?.explicitContentOptIn)}
          isMatch={false}
        />
      )}

      {newMatch && user && (
        <AlertDialog open={!!newMatch} onOpenChange={() => setNewMatch(null)}>
            <AlertDialogContent className="overflow-hidden">
                <AlertDialogHeader className="items-center">
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.05 }}>
                      <AlertDialogTitle className="text-3xl font-headline text-primary">{t('dashboard.itsAMatch')}</AlertDialogTitle>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
                      <AlertDialogDescription>{t('dashboard.matchDescription', { name: newMatch.name || '' })}</AlertDialogDescription>
                    </motion.div>
                </AlertDialogHeader>
                <motion.div className="flex justify-center items-center gap-4 my-4" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.1 }}>
                    <motion.div whileHover={{ scale: 1.05 }}><Avatar className="w-24 h-24 border-4 border-primary/30 shadow-glow-primary"><AvatarImage src={user.photoURL || ''} /><AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback></Avatar></motion.div>
                    <motion.span className="text-2xl" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>❤️</motion.span>
                    <motion.div whileHover={{ scale: 1.05 }}><Avatar className="w-24 h-24 border-4 border-primary/30 shadow-glow-primary"><AvatarImage src={newMatch.images?.[0]} /><AvatarFallback>{newMatch.name?.charAt(0)}</AvatarFallback></Avatar></motion.div>
                </motion.div>
                <AlertDialogFooter className="sm:justify-center">
                    <AlertDialogCancel onClick={() => setNewMatch(null)}>{t('dashboard.keepSwiping')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => router.push(`/chat/${newMatch.id}`)}>{t('dashboard.sendMessage')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </AppLayout>
  );
}
