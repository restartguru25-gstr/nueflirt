'use client';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useUser, setDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import type { Subscription } from '@/types';
import { Check, Crown, Loader2, Zap, Heart, RefreshCcw } from 'lucide-react';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const freeFeatures = ["5 AI video generations per month", "Standard matching filters", "Unlimited Swipes"];
const premiumFeatures = [
    { text: "See who liked you", icon: Heart },
    { text: "Profile Boosts", icon: Zap },
    { text: "Undo Swipes (Rewind)", icon: RefreshCcw },
    { text: "25 AI video generations per month", icon: Check },
    { text: "Advanced matching filters", icon: Check },
    { text: "Interactive Reveals", icon: Check },
];

export default function SubscribePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubscribing, setIsSubscribing] = useState(false);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [isUserLoading, user, router]);

    const subscriptionRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'subscriptions', user.uid);
    }, [firestore, user]);

    const { data: subscription, isLoading: isSubscriptionLoading } = useDoc<Subscription>(subscriptionRef);

    const handleSubscribe = () => {
        if (!user || !firestore || !subscriptionRef) return;
        setIsSubscribing(true);

        const oneMonthFromNow = new Date();
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

        const subscriptionData = {
            userId: user.uid,
            planType: 'premium',
            startDate: serverTimestamp(),
            endDate: oneMonthFromNow,
        };

        setDocumentNonBlocking(subscriptionRef, subscriptionData, { merge: true });
        
        setTimeout(() => {
            toast({
                title: "You're a Premium Member!",
                description: "You've unlocked all premium features.",
            });
            setIsSubscribing(false);
        }, 1000); // Simulate network latency
    };

    const isLoading = isUserLoading || isSubscriptionLoading;
    const isPremium = subscription?.planType === 'premium';

    if (isLoading) {
        return <AppLayout><div className="flex items-center justify-center h-full">Loading...</div></AppLayout>;
    }

    return (
        <AppLayout>
            <div className="space-y-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold font-headline">Upgrade Your Experience</h1>
                    <p className="text-muted-foreground mt-2">Unlock exclusive features and find your perfect match faster.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Free Plan</CardTitle>
                            <CardDescription>Our standard experience to get you started.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-3xl font-bold">₹0<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                            <ul className="space-y-2">
                                {freeFeatures.map(feat => (
                                    <li key={feat} className="flex items-center gap-2">
                                        <Check className="h-5 w-5 text-primary" />
                                        <span className="text-muted-foreground">{feat}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" disabled={!isPremium}>Your Current Plan</Button>
                        </CardFooter>
                    </Card>
                     <Card className="border-primary relative">
                        <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                            <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">Most Popular</div>
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Crown className="text-amber-500"/>
                                Premium Plan
                            </CardTitle>
                            <CardDescription>Supercharge your dating life.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <p className="text-3xl font-bold">₹499<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                            <ul className="space-y-2">
                                {premiumFeatures.map(feat => (
                                    <li key={feat.text} className="flex items-center gap-2">
                                        <feat.icon className="h-5 w-5 text-primary" />
                                        <span className="font-semibold">{feat.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" onClick={handleSubscribe} disabled={isSubscribing || isPremium}>
                                {isSubscribing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isSubscribing ? "Upgrading..." : (isPremium ? "You are a Premium Member" : "Upgrade to Premium")}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
