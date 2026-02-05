'use client';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AppLayout } from "@/components/app-layout";
import { notFound, useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MoreVertical, Send, Sparkles, Loader2, ShieldAlert, X, Ban, ImagePlus, Smile, Mic, Video, Phone, VideoIcon, Calendar, Users, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Message, User as ChatUser, Chat, VirtualDate, Match } from '@/types';
import { useUser, useDoc, useFirestore, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, serverTimestamp, where, getDocs, updateDoc, or, Timestamp } from 'firebase/firestore';
import { generateInteractiveReveal } from '@/ai/flows/interactive-reveal-generation';
import { generateIcebreakers } from '@/ai/flows/icebreaker-generation';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { dummyProfiles } from '@/lib/dummy-profiles';
import { useOfflineMessages } from '@/hooks/use-offline';
import { useLocale } from '@/contexts/locale-context';
import { CHAT_GIF_OPTIONS } from '@/lib/chat-gifs';
import { getOverallCompatibilityScore } from '@/lib/zodiac';
import { CHAT_EXPIRY_DAYS, EXTEND_MATCH_CREDITS, SITUATIONSHIP_EXTEND_DAYS } from '@/lib/limits';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import { useWebRTCCall } from '@/hooks/use-webrtc-call';

const SENSITIVE_KEYWORDS = ['ugly', 'stupid', 'hate', 'kill', 'idiot', 'freak'];

function hasSensitiveKeywords(text: string) {
    if (!text) return false;
    const lowerCaseText = text.toLowerCase();
    return SENSITIVE_KEYWORDS.some(keyword => lowerCaseText.includes(keyword));
}

export default function ChatPage() {
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const { user: authUser, isUserLoading } = useUser();
    const firestore = useFirestore();

    const rawId = params.id as string;
    const isGroupChat = rawId?.startsWith?.('group-');
    const chatId = useMemo(() => {
        if (!authUser || !rawId) return null;
        if (isGroupChat) return rawId.slice(6);
        return [authUser.uid, rawId].sort().join('_');
    }, [authUser, rawId, isGroupChat]);
    const otherUserId = isGroupChat ? undefined : rawId;
    const [reportReason, setReportReason] = useState("");
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [showSafetyWarning, setShowSafetyWarning] = useState(false);
    const [icebreakerPopoverOpen, setIcebreakerPopoverOpen] = useState(false);
    const [gifPopoverOpen, setGifPopoverOpen] = useState(false);
    const [callModalOpen, setCallModalOpen] = useState(false);
    const [callType, setCallType] = useState<'voice' | 'video'>('voice');
    const [isCaller, setIsCaller] = useState(false);
    const callerStartedRef = useRef(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    const onVoiceResult = useCallback((result: { dataUrl: string; durationSeconds: number }) => {
        handleSendRef.current?.({ type: 'voice', mediaUrl: result.dataUrl, durationSeconds: result.durationSeconds });
    }, []);
    const { isRecording, isSupported: voiceSupported, startRecording, stopRecording } = useVoiceRecorder(onVoiceResult);
    const handleSendRef = useRef<(opts?: { type?: 'text' | 'image' | 'gif' | 'voice' | 'video'; mediaUrl?: string; durationSeconds?: number }) => void>(() => {});

    const webrtc = useWebRTCCall({
        firestore,
        chatId,
        myUid: authUser?.uid ?? null,
        remoteUid: otherUserId ?? null,
        callType,
        isCaller,
        active: callModalOpen,
    });

    useEffect(() => {
        if (webrtc.callState === 'incoming') {
            setCallModalOpen(true);
            setIsCaller(false);
        }
        if (webrtc.callState === 'ended' || webrtc.callState === 'declined') {
            setCallModalOpen(false);
        }
    }, [webrtc.callState]);

    useEffect(() => {
        if (callModalOpen && isCaller && chatId && authUser && otherUserId && !callerStartedRef.current) {
            callerStartedRef.current = true;
            webrtc.startCall();
        }
        if (!callModalOpen) callerStartedRef.current = false;
    }, [callModalOpen, isCaller, chatId, authUser?.uid, otherUserId]);

    const handleCloseCallModal = useCallback(() => {
        setCallModalOpen(false);
        if (webrtc.callState === 'incoming') webrtc.declineCall().catch(() => {});
        else if (webrtc.callState === 'outgoing' || webrtc.callState === 'connected') webrtc.endCall().catch(() => {});
    }, [webrtc.callState, webrtc.endCall, webrtc.declineCall]);

    // Fetch current user's full profile for Icebreaker context
    const currentUserProfileRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'user_profiles', authUser.uid) : null, [firestore, authUser]);
    const { data: currentUserProfile, isLoading: isCurrentUserProfileLoading } = useDoc<ChatUser>(currentUserProfileRef);
    
    useEffect(() => {
        if (!isUserLoading && !authUser) router.push('/login');
    }, [authUser, isUserLoading, router]);

    const chatPartnerProfileRef = useMemoFirebase(() => (firestore && otherUserId) ? doc(firestore, 'user_profiles', otherUserId) : null, [firestore, otherUserId]);
    const { data: chatPartnerProfileFromDb, isLoading: isChatPartnerLoading } = useDoc<ChatUser>(chatPartnerProfileRef);

    const chatPartnerProfile = useMemo(() => {
        if (chatPartnerProfileFromDb) {
            return chatPartnerProfileFromDb;
        }
        // If not found in DB, check dummy profiles
        const dummyUser = dummyProfiles.find(p => p.id === otherUserId);
        return dummyUser ? (dummyUser as ChatUser) : null;
    }, [chatPartnerProfileFromDb, otherUserId]);

    const chatRef = useMemoFirebase(() => (firestore && chatId) ? doc(firestore, 'chats', chatId) : null, [firestore, chatId]);
    const { data: chatData } = useDoc<Chat>(chatRef);

    const virtualDatesQuery = useMemoFirebase(() => (firestore && chatId) ? query(collection(firestore, 'virtual_dates'), where('chatId', '==', chatId)) : null, [firestore, chatId]);
    const { data: virtualDatesList } = useCollection<VirtualDate>(virtualDatesQuery);
    const virtualDate = useMemo(() => {
        if (!virtualDatesList?.length) return null;
        return virtualDatesList.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))[0] ?? null;
    }, [virtualDatesList]);

    const myMatchesQuery = useMemoFirebase(() => (firestore && authUser?.uid) ? query(collection(firestore, 'matches'), or(where('user1Id', '==', authUser.uid), where('user2Id', '==', authUser.uid))) : null, [firestore, authUser?.uid]);
    const { data: myMatches } = useCollection<Match>(myMatchesQuery);
    const matchDoc = useMemo(() => {
        if (!myMatches || !authUser?.uid || !otherUserId) return null;
        return myMatches.find(m => (m.user1Id === authUser.uid && m.user2Id === otherUserId) || (m.user1Id === otherUserId && m.user2Id === authUser.uid)) ?? null;
    }, [myMatches, authUser?.uid, otherUserId]);

    const creditsRef = useMemoFirebase(() => (firestore && authUser) ? doc(firestore, 'credit_balances', authUser.uid) : null, [firestore, authUser]);
    const { data: creditBalance } = useDoc<{ balance: number }>(creditsRef);

    const messagesQuery = useMemoFirebase(() => (firestore && chatId) ? query(collection(firestore, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc')) : null, [firestore, chatId]);
    const { data: rawMessages, isLoading: messagesLoading } = useCollection<Message>(messagesQuery);
    const liveMessages: Message[] = useMemo(() => rawMessages ? rawMessages.map(msg => ({ ...msg, timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date() })) : [], [rawMessages]);
    const { data: messages, isLoading: messagesLoadingFinal, isOffline } = useOfflineMessages(chatId, liveMessages, messagesLoading);
    const { t } = useLocale();

    const messagesList = messages ?? [];

    useEffect(() => {
        if (messagesList.some(msg => hasSensitiveKeywords(msg.text ?? ''))) {
            setShowSafetyWarning(true);
        }
    }, [messagesList]);

    const chatExpiresAt = chatData?.expiresAt?.toDate?.();
    const isExpired = chatExpiresAt ? chatExpiresAt < new Date() : false;
    const compatibilityScore = currentUserProfile && chatPartnerProfile ? getOverallCompatibilityScore(currentUserProfile, chatPartnerProfile) : null;


    const [newMessage, setNewMessage] = useState('');
    const [isRevealed, setIsRevealed] = useState(false);
    const [isGeneratingReveal, setIsGeneratingReveal] = useState(false);
    const [revealedVideoUrl, setRevealedVideoUrl] = useState<string | null>(null);
    const [isGeneratingIcebreakers, setIsGeneratingIcebreakers] = useState(false);
    const [icebreakers, setIcebreakers] = useState<string[]>([]);
    const [extendingMatch, setExtendingMatch] = useState(false);


    const handleTyping = (text: string) => {
      setNewMessage(text);
      if (!chatRef || !authUser) return;
  
      // Set typing to true immediately
      const typingUpdate: { [key: string]: any } = {
        // By including the participants array, we ensure that if this is the first write
        // to the chat document (a create operation), it will pass security rules.
        participants: [authUser.uid, otherUserId],
      };
      typingUpdate[`typing.${authUser.uid}`] = true;
      setDocumentNonBlocking(chatRef, typingUpdate, { merge: true });

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
  
      // Set a new timeout to clear the typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        if(!authUser) return;
        const typingClearUpdate: { [key: string]: any } = {};
        typingClearUpdate[`typing.${authUser.uid}`] = false;
        // On subsequent updates, we don't need to resend the participants array
        // because { merge: true } will keep the existing fields.
        setDocumentNonBlocking(chatRef, typingClearUpdate, { merge: true });
      }, 2000); // 2 seconds of inactivity
    };

    const extendExpiry = () => {
        const d = new Date();
        d.setDate(d.getDate() + CHAT_EXPIRY_DAYS);
        return d;
    };

    const handleSend = (opts?: { type?: 'text' | 'image' | 'gif' | 'voice' | 'video'; mediaUrl?: string; durationSeconds?: number }) => {
        const type = opts?.type ?? 'text';
        const mediaUrl = opts?.mediaUrl;
        const durationSeconds = opts?.durationSeconds;
        const label = type === 'image' ? 'Photo' : type === 'gif' ? 'GIF' : type === 'voice' ? 'Voice note' : type === 'video' ? 'Video' : '';
        const text = opts?.mediaUrl ? label : newMessage.trim();
        if (type === 'text' && !newMessage.trim()) return;
        if ((type === 'image' || type === 'gif' || type === 'voice' || type === 'video') && !mediaUrl) return;
        if (!firestore || !authUser || !chatId) return;
        const receiverId = chatData?.isGroup ? chatId : otherUserId!;
        if (!receiverId) return;
        if (isExpired) return;

        if (type === 'text' && hasSensitiveKeywords(newMessage)) {
            setShowSafetyWarning(true);
        }

        const chatDocRef = doc(firestore, 'chats', chatId);
        const messagesColRef = collection(firestore, 'chats', chatId, 'messages');

        const messageData = {
            text: type === 'text' ? newMessage : text,
            senderId: authUser.uid,
            receiverId,
            timestamp: serverTimestamp(),
            ...(type !== 'text' && { type, mediaUrl, ...(durationSeconds != null && { durationSeconds }) }),
        };
        const typingClearUpdate: { [key: string]: any } = {};
        typingClearUpdate[`typing.${authUser.uid}`] = false;

        const lastMsg = {
            text: type === 'text' ? newMessage : text,
            senderId: authUser.uid,
            timestamp: serverTimestamp(),
            ...(type !== 'text' && { type, mediaUrl, ...(durationSeconds != null && { durationSeconds }) }),
        };
        const participants = chatData?.isGroup ? chatData.participants : [authUser.uid, otherUserId!];
        const chatUpdate = {
            participants,
            lastMessage: lastMsg,
            expiresAt: extendExpiry(),
            ...typingClearUpdate,
        };

        setDocumentNonBlocking(chatDocRef, chatUpdate, { merge: true });
        addDocumentNonBlocking(messagesColRef, messageData);
        if (type === 'text') setNewMessage('');
        setGifPopoverOpen(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
    handleSendRef.current = handleSend;

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            handleSend({ type: 'image', mediaUrl: dataUrl });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('video/')) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            handleSend({ type: 'video', mediaUrl: dataUrl });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleReveal = async () => {
        if (!chatPartnerProfile?.images?.[0]) {
            toast({ variant: 'destructive', title: 'Cannot generate reveal' });
            return;
        }
        setIsGeneratingReveal(true);
        setRevealedVideoUrl(null);
        setIsRevealed(true);
        try {
            const result = await generateInteractiveReveal({ photoDataUri: chatPartnerProfile.images[0] });
            setRevealedVideoUrl(result.revealedVideoDataUri);
            toast({ title: 'Reveal Video Generated!' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Reveal Generation Failed' });
            setIsRevealed(false);
        } finally {
            setIsGeneratingReveal(false);
        }
    }

    const handleGenerateIcebreakers = async () => {
      if (!currentUserProfile || !chatPartnerProfile) {
        toast({ variant: 'destructive', title: 'Could not fetch profile info.' });
        return;
      }
      setIsGeneratingIcebreakers(true);
      setIcebreakers([]);
      try {
        const result = await generateIcebreakers({
          currentUserProfile: {
            name: currentUserProfile.name,
            bio: currentUserProfile.bio,
            interests: currentUserProfile.interests,
            promptAnswers: currentUserProfile.promptAnswers?.filter(p => p.answer?.trim())
          },
          otherUserProfile: {
            name: chatPartnerProfile.name,
            bio: chatPartnerProfile.bio,
            interests: chatPartnerProfile.interests,
            promptAnswers: chatPartnerProfile.promptAnswers?.filter(p => p.answer?.trim())
          }
        });
        setIcebreakers(result.icebreakers);
      } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Could not generate icebreakers.' });
      } finally {
        setIsGeneratingIcebreakers(false);
      }
    };


    const handleReport = () => {
        if (!reportReason.trim() || !firestore || !authUser || !otherUserId) {
            toast({ variant: 'destructive', title: 'Please provide a reason for the report.' });
            return;
        }

        const reportData = {
            reporterId: authUser.uid,
            reportedId: otherUserId,
            reason: reportReason,
            timestamp: serverTimestamp(),
        };

        addDocumentNonBlocking(collection(firestore, 'reports'), reportData);
        toast({ title: 'Report Submitted', description: `Thank you for helping keep our community safe.` });
        setReportReason("");
    };

    const handleBlock = () => {
        if (!firestore || !authUser || !otherUserId) return;
        addDocumentNonBlocking(collection(firestore, 'blocks'), {
            blockerId: authUser.uid,
            blockedId: otherUserId,
            createdAt: serverTimestamp(),
        });
        toast({ title: t('safety.userBlocked'), description: t('safety.userBlockedDesc') });
        router.push('/safety');
    };

    const closeReveal = () => {
        setIsRevealed(false);
        setRevealedVideoUrl(null);
    };

    const handleProposeVirtualDate = () => {
        if (!firestore || !authUser || !otherUserId || !chatId) return;
        const [u1, u2] = [authUser.uid, otherUserId].sort();
        addDocumentNonBlocking(collection(firestore, 'virtual_dates'), {
            user1Id: u1,
            user2Id: u2,
            chatId,
            proposedBy: authUser.uid,
            status: 'proposed',
            scheduledAt: new Date(),
            createdAt: serverTimestamp(),
        });
        toast({ title: t('chat.virtualDateProposed') });
    };

    const handleAcceptVirtualDate = async () => {
        if (!firestore || !virtualDate?.id) return;
        await updateDoc(doc(firestore, 'virtual_dates', virtualDate.id), { status: 'accepted' });
        toast({ title: t('chat.virtualDateAccepted') });
        setCallModalOpen(true);
        setCallType('video');
    };

    const handleDeclineVirtualDate = async () => {
        if (!firestore || !virtualDate?.id) return;
        await updateDoc(doc(firestore, 'virtual_dates', virtualDate.id), { status: 'declined' });
        toast({ title: t('chat.virtualDateDeclined') });
    };

    const handleExtendMatch = async () => {
        if (!firestore || !authUser || !matchDoc?.id || !creditsRef) return;
        const balance = creditBalance?.balance ?? 0;
        if (balance < EXTEND_MATCH_CREDITS) {
            toast({ variant: 'destructive', title: 'Not enough credits', description: `Extending costs ${EXTEND_MATCH_CREDITS} credits. You have ${balance}.` });
            return;
        }
        setExtendingMatch(true);
        try {
            const currentExp = matchDoc.expiresAt?.toDate?.() ?? matchDoc.expiresAt;
            const base = currentExp && (currentExp instanceof Date ? currentExp : new Date(currentExp)) > new Date()
                ? (currentExp instanceof Date ? currentExp : new Date(currentExp))
                : new Date();
            const newExpiresAt = new Date(base.getTime() + SITUATIONSHIP_EXTEND_DAYS * 24 * 60 * 60 * 1000);
            await updateDoc(doc(firestore, 'matches', matchDoc.id), { expiresAt: Timestamp.fromDate(newExpiresAt) });
            await updateDoc(creditsRef, { balance: Math.max(0, balance - EXTEND_MATCH_CREDITS) });
            toast({ title: 'Match extended!', description: `+${SITUATIONSHIP_EXTEND_DAYS} days. New expiry: ${newExpiresAt.toLocaleDateString()}.` });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Could not extend match' });
        } finally {
            setExtendingMatch(false);
        }
    };

    const isLoading = isUserLoading || isCurrentUserProfileLoading || isChatPartnerLoading || messagesLoadingFinal;

    const partnerIsTyping = otherUserId != null && chatData?.typing?.[otherUserId] === true;
    const lastSeenDate = chatPartnerProfile?.lastSeen?.toDate ? chatPartnerProfile.lastSeen.toDate() : null;
    const lastSeen = lastSeenDate ? formatDistanceToNow(lastSeenDate, { addSuffix: true }) : 'offline';
    const isOnline = lastSeenDate ? (new Date().getTime() - lastSeenDate.getTime()) < 2 * 60 * 1000 : false;
    const statusText = partnerIsTyping ? 'typing...' : (isOnline ? 'Online' : (lastSeenDate ? `Active ${lastSeen}` : 'Offline'));

    if (isLoading && !messagesList.length) return <AppLayout><div className='flex items-center justify-center h-full'>Loading chat...</div></AppLayout>

    if (!isGroupChat && !chatPartnerProfile) {
        if (!isChatPartnerLoading) notFound();
        return <AppLayout><div className='flex items-center justify-center h-full'>Loading chat...</div></AppLayout>;
    }
    const displayName = isGroupChat ? (chatData?.name || t('chat.group')) : (chatPartnerProfile?.name ?? '');


    return (
        <AppLayout>
            <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] bg-card border rounded-lg shadow-sm">
                {isExpired && (
                    <div className="mx-3 mt-2 p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-sm text-center">
                        {t('chat.expired')}
                    </div>
                )}
                {!isGroupChat && matchDoc?.expiresAt && !matchDoc.expired && (() => {
                    const expDate = matchDoc.expiresAt?.toDate?.() ?? (matchDoc.expiresAt instanceof Date ? matchDoc.expiresAt : new Date(matchDoc.expiresAt));
                    const now = new Date();
                    if (expDate <= now) return null;
                    const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                    const credits = creditBalance?.balance ?? 0;
                    return (
                        <div className="mx-3 mt-2 p-3 rounded-lg bg-primary/10 border border-primary/20 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm">
                                This match expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.
                            </span>
                            <Button size="sm" variant="secondary" className="gap-1" onClick={handleExtendMatch} disabled={extendingMatch || credits < EXTEND_MATCH_CREDITS}>
                                <Coins className="h-4 w-4" />
                                {extendingMatch ? 'Extending...' : `Extend +${SITUATIONSHIP_EXTEND_DAYS} days (${EXTEND_MATCH_CREDITS} credits)`}
                            </Button>
                        </div>
                    );
                })()}
                <div className="flex items-center p-3 border-b">
                    <Button variant="ghost" size="icon" className="mr-2" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
                    {isGroupChat ? (
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
                    ) : (
                        <Avatar><AvatarImage src={chatPartnerProfile!.images?.[0]} /><AvatarFallback>{chatPartnerProfile!.name?.charAt(0)}</AvatarFallback></Avatar>
                    )}
                    <div className="ml-3 flex-1 min-w-0">
                        <p className="font-semibold truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground">{isGroupChat ? (chatData?.participants?.length ?? 0) + ' ' + t('chat.participants') : (statusText + (compatibilityScore != null ? ` · ${compatibilityScore}% match` : ''))}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {!isGroupChat && (
                            <>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setCallType('voice'); setIsCaller(true); setCallModalOpen(true); }} title={t('chat.voiceCall')}>
                            <Phone className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setCallType('video'); setIsCaller(true); setCallModalOpen(true); }} title={t('chat.videoCall')}>
                            <VideoIcon className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleProposeVirtualDate} title={t('chat.virtualDate')}>
                            <Calendar className="h-5 w-5" />
                        </Button>
                            </>
                        )}
                        {!isGroupChat && currentUserProfile?.explicitContentOptIn && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="secondary" size="sm" className="bg-primary/10 text-primary hover:bg-primary/20"><Sparkles className="mr-2 h-4 w-4" /> Reveal</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Interactive Reveal</AlertDialogTitle><AlertDialogDescription>This will generate a new, unique AI video of {chatPartnerProfile?.name}. This feature is for users 18+ and requires consent.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleReveal}>I consent, Reveal</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        {!isGroupChat && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}><ShieldAlert className="mr-2 h-4 w-4 text-destructive" /> {t('safety.reportUser')}</DropdownMenuItem></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Report {chatPartnerProfile?.name ?? 'user'}</AlertDialogTitle>
                                            <AlertDialogDescription>Please provide a reason for reporting this user. Your report is anonymous.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <Textarea placeholder="E.g., Inappropriate messages, spam, etc." value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleReport} disabled={!reportReason.trim()}>Submit Report</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}><Ban className="mr-2 h-4 w-4 text-destructive" /> {t('safety.blockUser')}</DropdownMenuItem></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('safety.blockConfirmTitle', { name: chatPartnerProfile?.name ?? '' })}</AlertDialogTitle>
                                            <AlertDialogDescription>{t('safety.blockConfirmDesc')}</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('safety.blockUser')}</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        )}
                    </div>
                </div>

                <Dialog open={callModalOpen} onOpenChange={(open) => { if (!open) handleCloseCallModal(); else setCallModalOpen(true); }}>
                    <DialogContent className={webrtc.callState === 'connected' ? 'sm:max-w-2xl' : 'sm:max-w-md'}>
                        <DialogHeader>
                            <DialogTitle>
                                {webrtc.callState === 'incoming' && t('chat.incomingCall', { type: callType === 'video' ? t('chat.videoCall') : t('chat.voiceCall'), name: displayName })}
                                {webrtc.callState === 'outgoing' && (callType === 'voice' ? t('chat.voiceCall') : t('chat.videoCall'))}
                                {webrtc.callState === 'connected' && (callType === 'voice' ? t('chat.voiceCall') : t('chat.videoCall'))}
                                {!['incoming', 'outgoing', 'connected'].includes(webrtc.callState) && (callType === 'voice' ? t('chat.voiceCall') : t('chat.videoCall'))}
                            </DialogTitle>
                        </DialogHeader>
                        {webrtc.error && (
                            <Alert variant="destructive" className="rounded-lg">
                                <AlertDescription>{webrtc.error}</AlertDescription>
                            </Alert>
                        )}
                        {webrtc.callState === 'incoming' && (
                            <div className="flex flex-col items-center justify-center py-6 gap-4">
                                <Avatar className="h-20 w-20"><AvatarImage src={!isGroupChat ? chatPartnerProfile?.images?.[0] : undefined} /><AvatarFallback>{displayName?.charAt(0)}</AvatarFallback></Avatar>
                                <p className="text-sm text-muted-foreground">{t('chat.incomingCall', { type: callType === 'video' ? t('chat.videoCall') : t('chat.voiceCall'), name: displayName })}</p>
                                <div className="flex gap-2">
                                    <Button variant="destructive" onClick={() => { webrtc.declineCall(); setCallModalOpen(false); }}>{t('chat.decline')}</Button>
                                    <Button onClick={() => webrtc.acceptCall()}>{t('chat.accept')}</Button>
                                </div>
                            </div>
                        )}
                        {(webrtc.callState === 'idle' && isCaller) && (
                            <div className="flex flex-col items-center justify-center py-6 gap-4">
                                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Starting call...</p>
                            </div>
                        )}
                        {webrtc.callState === 'outgoing' && (
                            <div className="flex flex-col items-center justify-center py-6 gap-4">
                                <Avatar className="h-20 w-20"><AvatarImage src={!isGroupChat ? chatPartnerProfile?.images?.[0] : undefined} /><AvatarFallback>{displayName?.charAt(0)}</AvatarFallback></Avatar>
                                <p className="text-sm text-muted-foreground">{t('chat.calling', { name: displayName })}</p>
                                <div className="flex gap-2 items-center flex-wrap justify-center">
                                    {callType === 'video' && webrtc.localStream && (
                                        <video ref={(el) => { if (el) el.srcObject = webrtc.localStream; }} autoPlay muted playsInline className="w-32 h-32 object-cover rounded-lg bg-black" />
                                    )}
                                    <Button variant="destructive" onClick={handleCloseCallModal}>{t('chat.endCall')}</Button>
                                </div>
                            </div>
                        )}
                        {webrtc.callState === 'connected' && (
                            <div className="flex flex-col gap-3 py-2">
                                <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                                    {callType === 'video' ? (
                                        <>
                                            {webrtc.remoteStream && (
                                                <video ref={(el) => { if (el) el.srcObject = webrtc.remoteStream; }} autoPlay playsInline className="w-full h-full object-contain" />
                                            )}
                                            {!webrtc.remoteStream && (
                                                <div className="absolute inset-0 flex items-center justify-center text-white/80">
                                                    <span>Waiting for {displayName}...</span>
                                                </div>
                                            )}
                                            {webrtc.localStream && (
                                                <video ref={(el) => { if (el) el.srcObject = webrtc.localStream; }} autoPlay muted playsInline className="absolute bottom-2 right-2 w-24 h-24 object-cover rounded-lg border-2 border-white shadow-lg" />
                                            )}
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-white/80 gap-4">
                                            <Avatar className="h-20 w-20 border-2 border-white"><AvatarImage src={!isGroupChat ? chatPartnerProfile?.images?.[0] : undefined} /><AvatarFallback>{displayName?.charAt(0)}</AvatarFallback></Avatar>
                                            <span>Voice call with {displayName}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                    {callType === 'video' && (
                                        <Button variant="outline" size="icon" title={webrtc.isMutedVideo ? t('chat.cameraOn') : t('chat.cameraOff')} onClick={() => webrtc.setMutedVideo(!webrtc.isMutedVideo)}>
                                            <VideoIcon className={cn("h-5 w-5", webrtc.isMutedVideo && "opacity-50")} />
                                        </Button>
                                    )}
                                    <Button variant="outline" size="icon" title={webrtc.isMutedAudio ? t('chat.unmute') : t('chat.mute')} onClick={() => webrtc.setMutedAudio(!webrtc.isMutedAudio)}>
                                        <Mic className={cn("h-5 w-5", webrtc.isMutedAudio && "opacity-50")} />
                                    </Button>
                                    <Button variant="destructive" onClick={handleCloseCallModal}>{t('chat.endCall')}</Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
                
                {showSafetyWarning && (
                    <Alert variant="destructive" className="m-2 rounded-lg">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Safety Warning</AlertTitle>
                        <AlertDescription>
                            This conversation may contain sensitive content. Please remember to be respectful and report any inappropriate behavior.
                        </AlertDescription>
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => setShowSafetyWarning(false)}><X className="h-4 w-4" /></Button>
                    </Alert>
                )}

                {virtualDate?.status === 'proposed' && (
                    <div className="mx-3 mt-2 p-3 rounded-lg border bg-muted/50 flex flex-wrap items-center justify-between gap-2">
                        {virtualDate.proposedBy === authUser?.uid ? (
                            <span className="text-sm">{t('chat.virtualDateWaiting')}</span>
                        ) : (
                            <>
                                <span className="text-sm">{t('chat.virtualDateProposedBy', { name: chatPartnerProfile?.name ?? '' })}</span>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={handleDeclineVirtualDate}>{t('chat.decline')}</Button>
                                    <Button size="sm" onClick={handleAcceptVirtualDate}>{t('chat.accept')}</Button>
                                </div>
                            </>
                        )}
                    </div>
                )}
                {virtualDate?.status === 'accepted' && (
                    <div className="mx-3 mt-2 p-3 rounded-lg border bg-primary/10 flex items-center justify-between gap-2">
                        <span className="text-sm">{t('chat.virtualDateAcceptedJoin')}</span>
                        <Button size="sm" onClick={() => { setCallType('video'); setIsCaller(true); setCallModalOpen(true); }}>{t('chat.joinVirtualDate')}</Button>
                    </div>
                )}

                {isRevealed && (
                    <div className="relative aspect-[9/16] bg-black flex items-center justify-center">
                        {isGeneratingReveal && <div className='text-white flex flex-col items-center gap-2'><Loader2 className="h-8 w-8 animate-spin" /><p>Generating video...</p></div>}
                        {!isGeneratingReveal && revealedVideoUrl && <video key={revealedVideoUrl} className="h-full w-full object-contain" autoPlay controls playsInline><source src={revealedVideoUrl} type="video/mp4" /></video>}
                        <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/80" onClick={closeReveal}>Close Reveal</Button>
                    </div>
                )}

                <div className="flex-grow p-4 overflow-y-auto space-y-4">
                     {messagesList.length === 0 && !messagesLoadingFinal && (
                        <div className='flex flex-col items-center justify-center h-full text-center'>
                             {isGroupChat ? <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center mb-4"><Users className="h-12 w-12 text-primary" /></div> : <Avatar className="h-24 w-24 mb-4"><AvatarImage src={chatPartnerProfile?.images?.[0]} /><AvatarFallback>{chatPartnerProfile?.name?.charAt(0)}</AvatarFallback></Avatar>}
                            <h3 className="font-semibold text-xl">{displayName}</h3>
                            <p className='text-muted-foreground'>{isGroupChat ? t('chat.groupStart') : t('chat.sayHello')}</p>
                            {!isGroupChat && <p className='text-xs text-muted-foreground mt-2'>Stuck? Use the <Sparkles className="inline h-3 w-3" /> icon below to get AI-powered icebreakers.</p>}
                        </div>
                    )}
                    {messagesList.map((msg) => (
                        <div key={msg.id} className={cn("flex items-end gap-2", msg.senderId === authUser?.uid ? 'justify-end' : 'justify-start')}>
                             {msg.senderId !== authUser?.uid && (isGroupChat ? <Avatar className="h-8 w-8 flex-shrink-0"><AvatarFallback>?</AvatarFallback></Avatar> : <Avatar className="h-8 w-8 flex-shrink-0"><AvatarImage src={chatPartnerProfile?.images?.[0]} /></Avatar>)}
                            <div className={cn("max-w-xs md:max-w-md rounded-2xl overflow-hidden", msg.senderId === authUser?.uid ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-secondary rounded-bl-none', (msg.mediaUrl ? 'p-1' : 'p-3'))}>
                                {msg.mediaUrl && msg.type === 'voice' && (
                                    <audio controls src={msg.mediaUrl} className="max-w-full h-10 rounded" />
                                )}
                                {msg.mediaUrl && msg.type === 'video' && (
                                    <video controls src={msg.mediaUrl} className="max-h-48 w-full object-contain rounded-lg" playsInline />
                                )}
                                {msg.mediaUrl && (msg.type === 'image' || msg.type === 'gif' || !msg.type) && (
                                    <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={msg.mediaUrl} alt={msg.text || (msg.type === 'gif' ? 'GIF' : 'Image')} className="max-h-48 w-full object-contain rounded-lg" />
                                    </a>
                                )}
                                {(msg.text && msg.text !== 'Photo' && msg.text !== 'GIF' && msg.text !== 'Voice note' && msg.text !== 'Video') ? <p className={msg.mediaUrl ? 'text-xs mt-1 px-1' : ''}>{msg.text}</p> : null}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-3 border-t">
                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                    <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleVideoSelect} />
                    <div className="relative flex w-full items-center gap-2">
                        <Input
                            placeholder={isExpired ? t('chat.expired') : (isGroupChat ? t('chat.messageGroup') : t('chat.messagePlaceholder', { name: chatPartnerProfile?.name ?? '' }))}
                            className="pr-28"
                            value={newMessage}
                            onChange={(e) => handleTyping(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            disabled={!authUser || isExpired}
                        />
                        <div className="absolute right-1.5 flex items-center gap-0.5">
                            {!isExpired && (
                                <>
                                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => imageInputRef.current?.click()} title={t('chat.photo')}>
                                        <ImagePlus className="w-5 h-5" />
                                    </Button>
                                    {voiceSupported && (
                                        <Button variant="ghost" size="icon" className={cn("h-9 w-9", isRecording && "text-destructive")} onClick={isRecording ? stopRecording : startRecording} title={t('chat.voiceNote')}>
                                            <Mic className="w-5 h-5" />
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => videoInputRef.current?.click()} title={t('chat.video')}>
                                        <Video className="w-5 h-5" />
                                    </Button>
                                    <Popover open={gifPopoverOpen} onOpenChange={setGifPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9" title={t('chat.gif')}>
                                                <Smile className="w-5 h-5" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-2" side="top" align="end">
                                            <p className="text-xs font-medium mb-2">{t('chat.gif')}</p>
                                            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                                                {CHAT_GIF_OPTIONS.map((url, i) => (
                                                    <button key={i} type="button" className="aspect-square rounded overflow-hidden border hover:opacity-90" onClick={() => handleSend({ type: 'gif', mediaUrl: url })}>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                                    </button>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </>
                            )}
                            <Popover open={icebreakerPopoverOpen} onOpenChange={setIcebreakerPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9" disabled={isExpired}>
                                        <Sparkles className="w-5 h-5 text-primary" />
                                        <span className="sr-only">Generate Icebreakers</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className='w-80 mb-2' side="top" align="end">
                                    <div className="space-y-2 text-center">
                                        <h4 className="font-medium leading-none">AI Icebreakers</h4>
                                        <p className="text-sm text-muted-foreground">Click an idea to start the conversation.</p>
                                    </div>
                                    <div className='mt-4 space-y-2'>
                                        {isGeneratingIcebreakers && !icebreakers.length ? (
                                            <div className='text-sm text-muted-foreground flex items-center justify-center p-4'>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Generating...
                                            </div>
                                        ) : icebreakers.length === 0 ? (
                                           <Button variant="outline" className="w-full" onClick={handleGenerateIcebreakers} disabled={isGeneratingIcebreakers}>Generate Ideas</Button>
                                        ) : (
                                            icebreakers.map((ice, index) => (
                                                <Button key={index} variant="outline" size="sm" className='w-full text-left h-auto' onClick={() => { handleTyping(ice); setIcebreakerPopoverOpen(false); }}>
                                                    <p className='whitespace-normal'>{ice}</p>
                                                </Button>
                                            ))
                                        )}
                                         {(icebreakers.length > 0 && !isGeneratingIcebreakers) && (
                                            <Button variant="ghost" size="sm" className="w-full mt-2" onClick={handleGenerateIcebreakers}>
                                                Get new suggestions
                                            </Button>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Button size="icon" className="h-9 w-9" onClick={() => handleSend()} disabled={!authUser || isExpired || !newMessage.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
