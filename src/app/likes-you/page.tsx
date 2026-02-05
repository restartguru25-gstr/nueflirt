'use client';

import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Like, User, Subscription } from "@/types";
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Crown, Heart } from "lucide-react";

function LikedUserCard({ profile, like }: { profile: User; like: Like }) {
  const likedAt = like.createdAt?.toDate ? formatDistanceToNow(like.createdAt.toDate(), { addSuffix: true }) : 'recently';
  return (
    <Link href={`/chat/${profile.id}`} key={profile.id}>
      <Card className="overflow-hidden transition-all hover:scale-105 hover:shadow-primary/20">
        <div className="relative aspect-[3/4]">
          <Avatar className="w-full h-full rounded-none">
            <AvatarImage src={profile.images?.[0]} className="object-cover" />
            <AvatarFallback>{profile.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white">
            <p className="font-semibold truncate">{profile.name}</p>
            <p className="text-xs opacity-80">Liked you {likedAt}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function LikesYouPage() {
    const router = useRouter();
    const { user: authUser, isUserLoading } = useUser();
    const firestore = useFirestore();

    useEffect(() => {
        if (!isUserLoading && !authUser) {
            router.push('/login');
        }
    }, [authUser, isUserLoading, router]);

    const subscriptionRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'subscriptions', authUser.uid) : null, [firestore, authUser]);
    const { data: subscription, isLoading: isSubscriptionLoading } = useDoc<Subscription>(subscriptionRef);
    const isPremium = subscription?.planType === 'premium';

    const likesQuery = useMemoFirebase(() => {
        if (!firestore || !authUser || !isPremium) return null;
        return query(
            collection(firestore, 'likes'), 
            where('swipedId', '==', authUser.uid),
            orderBy('createdAt', 'desc')
        );
    }, [firestore, authUser, isPremium]);

    const { data: likes, isLoading: likesLoading } = useCollection<Like>(likesQuery);

    const likerIds = useMemo(() => {
        if (!likes) return [];
        return likes.map(like => like.swiperId);
    }, [likes]);

    const profilesQuery = useMemoFirebase(() => {
        if (!firestore || likerIds.length === 0) return null;
        return query(collection(firestore, 'user_profiles'), where('id', 'in', likerIds.slice(0, 30)));
    }, [firestore, likerIds]);

    const { data: likerProfiles, isLoading: profilesLoading } = useCollection<User>(profilesQuery);

    const profilesById = useMemo(() => {
        if (!likerProfiles) return new Map();
        return new Map(likerProfiles.map(p => [p.id, p]));
    }, [likerProfiles]);

    const isLoading = isUserLoading || isSubscriptionLoading || (isPremium && likesLoading) || (isPremium && likerIds.length > 0 && profilesLoading);

    if (isLoading) {
        return <AppLayout><div className="flex justify-center items-center h-full">Loading...</div></AppLayout>;
    }

    if (!isPremium) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Crown className="h-16 w-16 text-amber-400 mb-4" />
                    <h2 className="text-2xl font-bold font-headline">See Who Likes You</h2>
                    <p className="text-muted-foreground mt-2 max-w-md">This is a premium feature. Upgrade your account to see everyone who has already liked your profile.</p>
                    <Button asChild className="mt-6">
                        <Link href="/subscribe">Upgrade to Premium</Link>
                    </Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Who Likes You</h1>
                    <p className="text-muted-foreground">Here's everyone who's swiped right on you. It's a match if you like them back!</p>
                </div>
                {likes && likes.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {likes.map(like => {
                            const profile = profilesById.get(like.swiperId);
                            return profile ? <LikedUserCard key={like.id} profile={profile} like={like} /> : null;
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-center">
                        <Heart className="h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-lg font-semibold">No likes yet.</p>
                        <p className="text-sm text-muted-foreground">People who like you will appear here.</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
