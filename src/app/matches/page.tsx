'use client';

import { useState } from 'react';
import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Eye } from "lucide-react";
import type { Match, User } from "@/types";
import { collection, query, where, or, doc } from 'firebase/firestore';
import { dummyProfiles } from "@/lib/dummy-profiles";
import { ProfileRevealDialog } from "@/components/profile-reveal-dialog";

function MatchedUserCard({ profile, match, onRevealClick }: { profile: User; match: Match; onRevealClick?: () => void }) {
    const matchDate = match.matchedAt?.toDate ? match.matchedAt.toDate() : match.matchedAt;
    const matchedAt = matchDate ? formatDistanceToNow(matchDate, { addSuffix: true }) : 'recently';
    const hasRevealContent = !!(profile.revealTeaserUrl || profile.teaserVideoUrl || profile.revealedVideoUrl) || (profile.explicitContentOptIn && profile.images?.[0]);

    return (
        <div className="relative">
            <Link href={`/chat/${profile.id}`} key={profile.id}>
                <Card className="overflow-hidden transition-all hover:scale-105 hover:shadow-primary/20">
                    <div className="relative aspect-[3/4]">
                        <Avatar className="w-full h-full rounded-none">
                            <AvatarImage src={profile.images?.[0]} className="object-cover" />
                            <AvatarFallback>{profile.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white">
                            <p className="font-semibold truncate">{profile.name}</p>
                            <p className="text-xs opacity-80">
                                Matched {matchedAt}
                            </p>
                        </div>
                    </div>
                </Card>
            </Link>
            {hasRevealContent && onRevealClick && (
                <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRevealClick(); }}
                    aria-label="View reveal"
                >
                    <Eye className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}


export default function MatchesPage() {
    const router = useRouter();
    const { user: authUser, isUserLoading } = useUser();
    const firestore = useFirestore();

    useEffect(() => {
        if (!isUserLoading && !authUser) {
            router.push('/login');
        }
    }, [authUser, isUserLoading, router]);

    const matchesQuery = useMemoFirebase(() => {
        if (!firestore || !authUser) return null;
        return query(collection(firestore, 'matches'), or(where('user1Id', '==', authUser.uid), where('user2Id', '==', authUser.uid)));
    }, [firestore, authUser]);

    const { data: matches, isLoading: matchesLoading } = useCollection<Match>(matchesQuery);

    const matchedUserIds = useMemo(() => {
        if (!matches || !authUser) return [];
        return matches.map(m => m.user1Id === authUser.uid ? m.user2Id : m.user1Id);
    }, [matches, authUser]);

    const profilesQuery = useMemoFirebase(() => {
        if (!firestore || matchedUserIds.length === 0) return null;
        // Firestore 'in' queries are limited to 30 items.
        // For a real app, pagination would be needed here.
        return query(collection(firestore, 'user_profiles'), where('id', 'in', matchedUserIds.slice(0, 30)));
    }, [firestore, matchedUserIds]);

    const { data: matchedProfiles, isLoading: profilesLoading } = useCollection<User>(profilesQuery);

    const profilesById = useMemo(() => {
        if (!matchedProfiles) return new Map();
        return new Map(matchedProfiles.map(p => [p.id, p]));
    }, [matchedProfiles]);

    const subscriptionRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'subscriptions', authUser.uid) : null, [firestore, authUser]);
    const creditsRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'credit_balances', authUser.uid) : null, [firestore, authUser]);
    const currentProfileRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'user_profiles', authUser.uid) : null, [firestore, authUser]);
    const currentUserDataRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'users', authUser.uid) : null, [firestore, authUser]);
    const { data: subscription } = useDoc<{ planType?: string }>(subscriptionRef);
    const { data: credits } = useDoc<{ balance?: number }>(creditsRef);
    const { data: currentUserProfile } = useDoc<User>(currentProfileRef);
    const { data: currentUserData } = useDoc<{ explicitContentOptIn?: boolean }>(currentUserDataRef);
    const [revealProfile, setRevealProfile] = useState<User | null>(null);

    const displayData = useMemo(() => {
        if (!authUser) return [];
        const now = new Date();
        const nonExpired = (matches ?? []).filter(m => {
          if (m.expired) return false;
          const exp = m.expiresAt?.toDate?.() ?? m.expiresAt;
          if (exp && exp < now) return false;
          return true;
        });
        const realData = nonExpired
            .map((match: Match) => {
                const otherUserId = authUser && (match.user1Id === authUser.uid ? match.user2Id : match.user1Id);
                const profile = otherUserId ? profilesById.get(otherUserId) : undefined;
                if (!profile) return null;
                return { match, profile };
            })
            .filter((item): item is { match: Match; profile: User } => item !== null);

        const realProfileIds = new Set(realData.map(d => d.profile.id));

        const dummyData = dummyProfiles.slice(0, 4).map((dummyProfile, index) => {
            if (realProfileIds.has(dummyProfile.id)) return null;

            const dummyMatch: Match = {
                id: `dummy-match-${index}`,
                user1Id: authUser.uid,
                user2Id: dummyProfile.id,
                matchedAt: new Date(new Date().getTime() - (index + 1) * 24 * 60 * 60 * 1000), // Matched 1, 2, 3, 4 days ago
            };
            return { match: dummyMatch, profile: dummyProfile };
        }).filter((item): item is { match: Match; profile: User } => item !== null);

        return [...realData, ...dummyData];

    }, [matches, profilesById, authUser]);

    const isLoading = isUserLoading || matchesLoading || (matchedUserIds.length > 0 && profilesLoading);

    if (isLoading) {
        return <AppLayout><div className="flex justify-center items-center h-full">Loading your matches...</div></AppLayout>
    }

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Your Matches</h1>
                    <p className="text-muted-foreground">This is where your conversations begin.</p>
                </div>
                {displayData && displayData.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {displayData.map(({match, profile}) => (
                                <MatchedUserCard
                                    key={match.id}
                                    profile={profile}
                                    match={match}
                                    onRevealClick={() => setRevealProfile(profile)}
                                />
                            ))}
                        </div>
                        {revealProfile && authUser && currentUserProfile && (
                            <ProfileRevealDialog
                                profile={revealProfile}
                                currentUserId={authUser.uid}
                                open={!!revealProfile}
                                onOpenChange={(open) => !open && setRevealProfile(null)}
                                isPremium={subscription?.planType === 'premium'}
                                credits={credits?.balance ?? 0}
                                currentUserExplicitOptIn={!!(currentUserData?.explicitContentOptIn ?? currentUserProfile?.explicitContentOptIn)}
                                isMatch={true}
                            />
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No matches yet.</p>
                        <p className="text-sm text-muted-foreground">Keep swiping to find a connection!</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
