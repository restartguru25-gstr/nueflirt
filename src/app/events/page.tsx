'use client';

import { useEffect, useMemo } from 'react';
import { AppLayout } from '@/components/app-layout';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import type { AppEvent, EventRsvp } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin } from 'lucide-react';
import { useLocale } from '@/contexts/locale-context';
import { addDocumentNonBlocking } from '@/firebase';
import { format } from 'date-fns';

export default function EventsPage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { t } = useLocale();

    useEffect(() => {
        if (!isUserLoading && !user) router.push('/login');
    }, [user, isUserLoading, router]);

    const eventsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'events'), orderBy('date', 'asc')) : null, [firestore]);
    const { data: events } = useCollection<AppEvent>(eventsQuery);

    const rsvpsQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, 'event_rsvps'), orderBy('createdAt', 'desc')) : null, [firestore, user]);
    const { data: rsvps } = useCollection<EventRsvp>(rsvpsQuery);
    const myRsvps = useMemo(() => rsvps?.filter(r => r.userId === user?.uid) ?? [], [rsvps, user?.uid]);
    const rsvpByEvent = useMemo(() => {
        const m = new Map<string, 'interested' | 'going'>();
        myRsvps.forEach(r => m.set(r.eventId, r.status));
        return m;
    }, [myRsvps]);

    const handleRsvp = (eventId: string, status: 'interested' | 'going') => {
        if (!firestore || !user) return;
        addDocumentNonBlocking(collection(firestore, 'event_rsvps'), {
            eventId,
            userId: user.uid,
            status,
            createdAt: serverTimestamp(),
        });
    };

    if (isUserLoading || !user) return <AppLayout><div className="flex justify-center items-center h-full">{t('common.loading')}</div></AppLayout>;

    return (
        <AppLayout>
            <div className="space-y-8 max-w-3xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                        <Calendar className="h-8 w-8 text-primary" />
                        {t('events.title')}
                    </h1>
                    <p className="text-muted-foreground mt-1">{t('events.subtitle')}</p>
                </div>

                {events && events.length > 0 ? (
                    <div className="space-y-4">
                        {events.map((ev) => {
                            const dateObj = ev.date?.toDate?.();
                            const rsvpStatus = rsvpByEvent.get(ev.id);
                            return (
                                <Card key={ev.id}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xl">{ev.title}</CardTitle>
                                        <CardDescription>{ev.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {dateObj && (
                                            <p className="text-sm flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                {format(dateObj, 'PPP p')}
                                            </p>
                                        )}
                                        {ev.location && (
                                            <p className="text-sm flex items-center gap-2 text-muted-foreground">
                                                <MapPin className="h-4 w-4" />
                                                {ev.location}
                                            </p>
                                        )}
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                variant={rsvpStatus === 'interested' ? 'secondary' : 'outline'}
                                                size="sm"
                                                onClick={() => handleRsvp(ev.id, 'interested')}
                                            >
                                                {t('events.interested')}
                                            </Button>
                                            <Button
                                                variant={rsvpStatus === 'going' ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => handleRsvp(ev.id, 'going')}
                                            >
                                                {t('events.going')}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{t('events.noEvents')}</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
