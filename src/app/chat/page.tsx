'use client';

import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Chat, User, Block, Match } from "@/types";
import { collection, query, where, orderBy, addDoc } from 'firebase/firestore';
import { MessagesSquare, Users, Plus } from "lucide-react";
import { useOfflineChats } from "@/hooks/use-offline";
import { useLocale } from "@/contexts/locale-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function GroupChatListItem({ chat, expiredLabel }: { chat: Chat; expiredLabel: string }) {
    const lastMessage = chat.lastMessage;
    const lastMessageText = lastMessage?.text ?? 'No messages yet';
    const lastMessageTime = lastMessage?.timestamp?.toDate ? formatDistanceToNow(lastMessage.timestamp.toDate(), { addSuffix: true }) : '';
    const expiresAt = chat.expiresAt?.toDate?.();
    const isExpired = expiresAt ? expiresAt < new Date() : false;
    return (
        <Link href={`/chat/group-${chat.id}`} className="block hover:bg-secondary/50 rounded-lg transition-colors">
            <div className="flex items-center p-3 space-x-4">
                <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-grow overflow-hidden min-w-0">
                    <div className="flex justify-between items-center gap-2">
                        <p className="font-semibold truncate">{chat.name || 'Group'}</p>
                        {lastMessageTime && <p className="text-xs text-muted-foreground flex-shrink-0">{lastMessageTime}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground truncate">{lastMessageText}</p>
                        {isExpired && <span className="text-xs text-amber-600 dark:text-amber-400 flex-shrink-0">{expiredLabel}</span>}
                    </div>
                </div>
            </div>
        </Link>
    );
}

function ChatListItem({ profile, chat, startConversationLabel, expiredLabel }: { profile: User, chat: Chat; startConversationLabel: string; expiredLabel: string }) {
    const lastMessage = chat.lastMessage;
    const lastMsgType = lastMessage?.type;
    let lastMessageText: string;
    if (lastMessage) {
        lastMessageText = lastMsgType === 'image' ? 'Photo' : lastMsgType === 'gif' ? 'GIF' : lastMsgType === 'voice' ? 'Voice note' : lastMsgType === 'video' ? 'Video' : (lastMessage.text ?? '');
    } else {
        lastMessageText = startConversationLabel;
    }
    const lastMessageTime = lastMessage?.timestamp?.toDate ? formatDistanceToNow(lastMessage.timestamp.toDate(), { addSuffix: true }) : '';
    const expiresAt = chat.expiresAt?.toDate?.();
    const isExpired = expiresAt ? expiresAt < new Date() : false;

    return (
        <Link href={`/chat/${profile.id}`} key={profile.id} className="block hover:bg-secondary/50 rounded-lg transition-colors">
            <div className="flex items-center p-3 space-x-4">
                <Avatar className="h-14 w-14 border-2">
                    <AvatarImage src={profile.images?.[0]} />
                    <AvatarFallback>{profile.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow overflow-hidden min-w-0">
                     <div className="flex justify-between items-center gap-2">
                        <p className="font-semibold truncate">{profile.name}</p>
                        {lastMessageTime && <p className="text-xs text-muted-foreground flex-shrink-0">{lastMessageTime}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground truncate">{lastMessageText}</p>
                        {isExpired && <span className="text-xs text-amber-600 dark:text-amber-400 flex-shrink-0">{expiredLabel}</span>}
                    </div>
                </div>
            </div>
        </Link>
    );
}


export default function ChatListPage() {
    const router = useRouter();
    const { user: authUser, isUserLoading } = useUser();
    const firestore = useFirestore();

    useEffect(() => {
        if (!isUserLoading && !authUser) {
            router.push('/login');
        }
    }, [authUser, isUserLoading, router]);

    const chatsQuery = useMemoFirebase(() => {
        if (!firestore || !authUser) return null;
        return query(
            collection(firestore, 'chats'), 
            where('participants', 'array-contains', authUser.uid),
            orderBy('lastMessage.timestamp', 'desc')
        );
    }, [firestore, authUser]);

    const { data: liveChats, isLoading: chatsLoading } = useCollection<Chat>(chatsQuery);
    const { data: chats, isLoading: chatsLoadingFinal, isOffline } = useOfflineChats(liveChats, chatsLoading);
    const { t } = useLocale();

    const blocksQuery = useMemoFirebase(() => (firestore && authUser) ? query(collection(firestore, 'blocks'), where('blockerId', '==', authUser.uid)) : null, [firestore, authUser]);
    const { data: blocks } = useCollection<Block>(blocksQuery);
    const blockedIds = useMemo(() => new Set((blocks ?? []).map(b => b.blockedId)), [blocks]);

    const otherUserIds = useMemo(() => {
        if (!chats || !authUser) return [];
        return chats.map(c => c.participants.find(p => p !== authUser.uid)).filter(id => !!id && !blockedIds.has(id)) as string[];
    }, [chats, authUser, blockedIds]);

    const profilesQuery = useMemoFirebase(() => {
        if (!firestore || otherUserIds.length === 0) return null;
        return query(collection(firestore, 'user_profiles'), where('id', 'in', otherUserIds.slice(0, 30)));
    }, [firestore, otherUserIds]);

    const { data: matchedProfiles, isLoading: profilesLoading } = useCollection<User>(profilesQuery);

    const profilesById = useMemo(() => {
        if (!matchedProfiles) return new Map();
        return new Map(matchedProfiles.map(p => [p.id, p]));
    }, [matchedProfiles]);

    const [newGroupOpen, setNewGroupOpen] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const matchesQuery = useMemoFirebase(() => (firestore && authUser) ? query(collection(firestore, 'matches'), where('user1Id', '==', authUser.uid)) : null, [firestore, authUser]);
    const { data: matchesUser1 } = useCollection<Match>(matchesQuery);
    const matchesQuery2 = useMemoFirebase(() => (firestore && authUser) ? query(collection(firestore, 'matches'), where('user2Id', '==', authUser.uid)) : null, [firestore, authUser]);
    const { data: matchesUser2 } = useCollection<Match>(matchesQuery2);
    const matchIds = useMemo(() => {
        const ids = new Set<string>();
        matchesUser1?.forEach(m => ids.add(m.user2Id));
        matchesUser2?.forEach(m => ids.add(m.user1Id));
        return Array.from(ids).filter(id => !blockedIds.has(id));
    }, [matchesUser1, matchesUser2, blockedIds]);
    const matchProfilesQuery = useMemoFirebase(() => (firestore && matchIds.length > 0) ? query(collection(firestore, 'user_profiles'), where('id', 'in', matchIds.slice(0, 20))) : null, [firestore, matchIds]);
    const { data: matchProfiles } = useCollection<User>(matchProfilesQuery);

    const handleCreateGroup = async () => {
        if (!firestore || !authUser || !groupName.trim() || selectedIds.size === 0) return;
        const participants = [authUser.uid, ...Array.from(selectedIds)];
        const ref = await addDoc(collection(firestore, 'chats'), {
            participants,
            isGroup: true,
            name: groupName.trim(),
        });
        setNewGroupOpen(false);
        setGroupName('');
        setSelectedIds(new Set());
        router.push(`/chat/group-${ref.id}`);
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const isLoading = isUserLoading || chatsLoadingFinal || (otherUserIds.length > 0 && profilesLoading);

    if (isLoading) {
        return <AppLayout><div className="flex justify-center items-center h-full">{t('chat.loadingConversations')}</div></AppLayout>
    }

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">{t('chat.conversations')}</h1>
                        <p className="text-muted-foreground">{t('chat.conversations')}</p>
                        {isOffline && <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">{t('chat.offlineMessage')}</p>}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setNewGroupOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> {t('chat.newGroup')}
                    </Button>
                </div>
                <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('chat.newGroup')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>{t('chat.groupName')}</Label>
                                <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder={t('chat.groupNamePlaceholder')} className="mt-1" />
                            </div>
                            <div>
                                <Label>{t('chat.addFromMatches')}</Label>
                                <div className="mt-2 max-h-40 overflow-y-auto space-y-2 border rounded p-2">
                                    {matchProfiles?.length ? matchProfiles.map(p => (
                                        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} />
                                            <Avatar className="h-6 w-6"><AvatarImage src={p.images?.[0]} /><AvatarFallback>{p.name?.charAt(0)}</AvatarFallback></Avatar>
                                            <span className="text-sm">{p.name}</span>
                                        </label>
                                    )) : <p className="text-sm text-muted-foreground">{t('chat.noMatchesForGroup')}</p>}
                                </div>
                            </div>
                            <Button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedIds.size === 0}>{t('chat.createGroup')}</Button>
                        </div>
                    </DialogContent>
                </Dialog>
                {chats && chats.length > 0 ? (
                    <div className="divide-y border rounded-lg">
                        {chats.map(chat => {
                            if (chat.isGroup) return <GroupChatListItem key={chat.id} chat={chat} expiredLabel={t('chat.expired')} />;
                            const otherUserId = authUser && chat.participants.find(p => p !== authUser.uid);
                            if (!otherUserId || blockedIds.has(otherUserId)) return null;
                            const profile = profilesById.get(otherUserId);
                            return profile ? <ChatListItem key={chat.id} profile={profile} chat={chat} startConversationLabel={t('chat.startConversation')} expiredLabel={t('chat.expired')} /> : null;
                        })}
                    </div>
                ) : (
                     <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-center p-4">
                        <MessagesSquare className="h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-lg font-semibold">No conversations yet.</p>
                        <p className="text-sm text-muted-foreground">When you match with someone, your conversation will appear here.</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
