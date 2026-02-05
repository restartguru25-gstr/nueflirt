'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Chat, User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ToastAction } from './ui/toast';

export function NotificationHandler() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const previousChats = useRef<Map<string, any>>(new Map());

  const chatsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'chats'), where('participants', 'array-contains', user.uid));
  }, [firestore, user]);

  const { data: chats } = useCollection<Chat>(chatsQuery);

  const otherUserIds = useMemo(() => {
    if (!chats || !user) return [];
    return chats.map(c => c.participants.find(p => p !== user.uid)).filter(id => !!id) as string[];
  }, [chats, user]);

  const profilesQuery = useMemoFirebase(() => {
    if (!firestore || otherUserIds.length === 0) return null;
    return query(collection(firestore, 'user_profiles'), where('id', 'in', otherUserIds.slice(0, 30)));
  }, [firestore, otherUserIds]);

  const { data: matchedProfiles } = useCollection<User>(profilesQuery);

  const profilesById = useMemo(() => {
    if (!matchedProfiles) return new Map();
    return new Map(matchedProfiles.map(p => [p.id, p]));
  }, [matchedProfiles]);

  useEffect(() => {
    if (isUserLoading || !chats || !user) return;

    const currentChats = new Map(chats.map(c => [c.id, c.lastMessage]));

    currentChats.forEach((lastMessage, chatId) => {
      const prevLastMessage = previousChats.current.get(chatId);

      if (lastMessage && (!prevLastMessage || lastMessage.timestamp > prevLastMessage.timestamp)) {
        const isNewMessageFromOtherUser = lastMessage.senderId !== user.uid;
        const otherUserId = lastMessage.senderId;
        const isNotOnChatPage = pathname !== `/chat/${otherUserId}`;
        
        if (isNewMessageFromOtherUser && isNotOnChatPage) {
          const senderId = lastMessage.senderId;
          const senderProfile = profilesById.get(senderId);

          if (senderProfile) {
            toast({
              title: `New message from ${senderProfile.name}`,
              description: lastMessage.text,
              action: <ToastAction altText="View" onClick={() => router.push(`/chat/${senderId}`)}>View</ToastAction>,
            });
          }
        }
      }
    });

    previousChats.current = currentChats;

  }, [chats, user, isUserLoading, pathname, profilesById, router, toast]);

  return null; // This component does not render anything
}
