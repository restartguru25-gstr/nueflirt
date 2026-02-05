'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  cacheProfiles,
  getCachedProfiles,
  cacheMyProfile,
  getCachedMyProfile,
  cacheChats,
  getCachedChats,
  cacheMessages,
  getCachedMessages,
  isOnline,
} from '@/lib/offline-cache';
import type { User } from '@/types';
import type { Chat } from '@/types';
import type { Message } from '@/types';

/** Subscribe to online/offline. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(isOnline());

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return online;
}

/**
 * When online: returns live data and caches it.
 * When offline: returns cached data (if any).
 */
export function useOfflineProfiles(
  liveProfiles: User[] | null,
  isLoading: boolean
): { data: User[] | null; isLoading: boolean; isOffline: boolean } {
  const online = useOnline();
  const [cached, setCached] = useState<User[] | null>(null);
  const [cachedLoaded, setCachedLoaded] = useState(false);

  // Persist live data to cache when online and we have data
  useEffect(() => {
    if (online && liveProfiles && liveProfiles.length > 0) {
      cacheProfiles(liveProfiles as unknown as { id: string; [k: string]: unknown }[]).catch(() => {});
    }
  }, [online, liveProfiles]);

  // When going offline or on mount while offline, load from cache
  useEffect(() => {
    if (!online) {
      setCachedLoaded(false);
      getCachedProfiles()
        .then((list) => {
          setCached(list as User[] | null);
          setCachedLoaded(true);
        })
        .catch(() => setCachedLoaded(true));
    } else {
      setCached(null);
      setCachedLoaded(true);
    }
  }, [online]);

  if (online) {
    return { data: liveProfiles, isLoading, isOffline: false };
  }
  return {
    data: cachedLoaded ? cached : null,
    isLoading: !cachedLoaded,
    isOffline: true,
  };
}

export function useOfflineMyProfile(
  liveProfile: (User & { id: string }) | null,
  isLoading: boolean
): { data: (User & { id: string }) | null; isLoading: boolean; isOffline: boolean } {
  const online = useOnline();
  const [cached, setCached] = useState<(User & { id: string }) | null>(null);
  const [cachedLoaded, setCachedLoaded] = useState(false);

  useEffect(() => {
    if (online && liveProfile) {
      cacheMyProfile(liveProfile as unknown as { id: string; [k: string]: unknown }).catch(() => {});
    }
  }, [online, liveProfile]);

  useEffect(() => {
    if (!online) {
      setCachedLoaded(false);
      getCachedMyProfile()
        .then((p) => {
          setCached(p as (User & { id: string }) | null);
          setCachedLoaded(true);
        })
        .catch(() => setCachedLoaded(true));
    } else {
      setCached(null);
      setCachedLoaded(true);
    }
  }, [online]);

  if (online) {
    return { data: liveProfile, isLoading, isOffline: false };
  }
  return {
    data: cachedLoaded ? cached : null,
    isLoading: !cachedLoaded,
    isOffline: true,
  };
}

export function useOfflineChats(
  liveChats: (Chat & { id: string })[] | null,
  isLoading: boolean
): { data: (Chat & { id: string })[] | null; isLoading: boolean; isOffline: boolean } {
  const online = useOnline();
  const [cached, setCached] = useState<(Chat & { id: string })[] | null>(null);
  const [cachedLoaded, setCachedLoaded] = useState(false);

  useEffect(() => {
    if (online && liveChats && liveChats.length > 0) {
      cacheChats(liveChats as unknown as { id: string; [k: string]: unknown }[]).catch(() => {});
    }
  }, [online, liveChats]);

  useEffect(() => {
    if (!online) {
      setCachedLoaded(false);
      getCachedChats()
        .then((list) => {
          setCached(list as (Chat & { id: string })[] | null);
          setCachedLoaded(true);
        })
        .catch(() => setCachedLoaded(true));
    } else {
      setCached(null);
      setCachedLoaded(true);
    }
  }, [online]);

  if (online) {
    return { data: liveChats, isLoading, isOffline: false };
  }
  return {
    data: cachedLoaded ? cached : null,
    isLoading: !cachedLoaded,
    isOffline: true,
  };
}

export function useOfflineMessages(
  chatId: string | null,
  liveMessages: Message[] | null,
  isLoading: boolean
): { data: Message[] | null; isLoading: boolean; isOffline: boolean } {
  const online = useOnline();
  const [cached, setCached] = useState<Message[] | null>(null);
  const [cachedLoaded, setCachedLoaded] = useState(false);

  useEffect(() => {
    if (online && chatId && liveMessages && liveMessages.length > 0) {
      const toCache = liveMessages.map((m) => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.getTime() : m.timestamp,
      }));
      cacheMessages(chatId, toCache).catch(() => {});
    }
  }, [online, chatId, liveMessages]);

  useEffect(() => {
    if (!online && chatId) {
      setCachedLoaded(false);
      getCachedMessages(chatId)
        .then((list) => {
          const raw = (list ?? []) as { timestamp?: number; [k: string]: unknown }[];
          const msgs = raw.map((m) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          })) as Message[];
          setCached(msgs);
          setCachedLoaded(true);
        })
        .catch(() => setCachedLoaded(true));
    } else {
      setCached(null);
      setCachedLoaded(true);
    }
  }, [online, chatId]);

  if (online) {
    return { data: liveMessages, isLoading, isOffline: false };
  }
  return {
    data: cachedLoaded ? cached : null,
    isLoading: !cachedLoaded,
    isOffline: true,
  };
}
