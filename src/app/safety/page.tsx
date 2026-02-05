'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '@/components/app-layout';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, doc, serverTimestamp } from 'firebase/firestore';
import type { Block, User } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, Ban, AlertCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/contexts/locale-context';
import { deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { getCurrentPosition } from '@/lib/geo';

export default function SafetyPage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useLocale();

    useEffect(() => {
        if (!isUserLoading && !user) router.push('/login');
    }, [user, isUserLoading, router]);

    const blocksQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'blocks'), where('blockerId', '==', user.uid)) : null, [firestore, user]);
    const { data: blocks } = useCollection<Block>(blocksQuery);

    const blockedIds = useMemo(() => (blocks ?? []).map(b => b.blockedId), [blocks]);

    const profilesQuery = useMemoFirebase(() => (firestore && blockedIds.length > 0) ? query(collection(firestore, 'user_profiles'), where('id', 'in', blockedIds.slice(0, 30))) : null, [firestore, blockedIds]);
    const { data: blockedProfiles } = useCollection<User>(profilesQuery);

    const profileById = useMemo(() => {
        if (!blockedProfiles) return new Map<string, User>();
        return new Map(blockedProfiles.map(p => [p.id, p]));
    }, [blockedProfiles]);

    const handleUnblock = (block: Block) => {
        if (!firestore) return;
        const blockRef = doc(firestore, 'blocks', block.id);
        deleteDocumentNonBlocking(blockRef);
        toast({ title: t('safety.unblocked') });
    };

    const [panicLoading, setPanicLoading] = useState(false);
    const handlePanic = () => {
        if (!firestore || !user) return;
        setPanicLoading(true);
        getCurrentPosition()
            .then(({ latitude, longitude }) => {
                addDocumentNonBlocking(collection(firestore, 'panic_reports'), {
                    userId: user.uid,
                    latitude,
                    longitude,
                    timestamp: serverTimestamp(),
                });
                toast({ title: t('safety.panicSent'), description: t('safety.panicSentDesc'), variant: 'default' });
            })
            .catch(() => toast({ variant: 'destructive', title: t('safety.panicError'), description: t('safety.panicErrorDesc') }))
            .finally(() => setPanicLoading(false));
    };

    if (isUserLoading || !user) return <AppLayout><div className="flex justify-center items-center h-full">{t('common.loading')}</div></AppLayout>;

    return (
        <AppLayout>
            <div className="space-y-8 max-w-2xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                        <Shield className="h-8 w-8 text-primary" />
                        {t('safety.title')}
                    </h1>
                    <p className="text-muted-foreground mt-1">{t('safety.subtitle')}</p>
                </div>

                <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> {t('safety.panicTitle')}</CardTitle>
                        <CardDescription>{t('safety.panicDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" className="w-full" onClick={handlePanic} disabled={panicLoading}>
                            {panicLoading ? t('common.loading') : t('safety.panicButton')}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Ban className="h-5 w-5" /> {t('safety.blockedUsers')}</CardTitle>
                        <CardDescription>People you blocked will not appear in discovery or be able to message you.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {blocks && blocks.length > 0 ? (
                            <ul className="space-y-3">
                                {blocks.map(block => {
                                    const profile = profileById.get(block.blockedId);
                                    return (
                                        <li key={block.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={profile?.images?.[0]} />
                                                    <AvatarFallback>{profile?.name?.charAt(0) ?? '?'}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{profile?.name ?? block.blockedId.slice(0, 8)}</span>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => handleUnblock(block)}>{t('safety.unblock')}</Button>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground text-sm">{t('safety.noBlockedUsers')}</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /> {t('safety.safetyTips')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm">• {t('safety.tip1')}</p>
                        <p className="text-sm">• {t('safety.tip2')}</p>
                        <p className="text-sm">• {t('safety.tip3')}</p>
                        <p className="text-sm">• {t('safety.tip4')}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('safety.idVerification')}</CardTitle>
                        <CardDescription>{t('safety.idVerificationDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="outline">
                            <Link href="/profile">{t('safety.goToProfile')}</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
