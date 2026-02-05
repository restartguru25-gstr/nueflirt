'use client';

import { useEffect, useRef } from 'react';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';

export function usePresence() {
  const { user } = useUser();
  const firestore = useFirestore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user || !firestore) {
      return;
    }

    const userProfileRef = doc(firestore, 'user_profiles', user.uid);

    const updatePresence = () => {
      // Ensure we don't try to update if user has logged out
      if (user) {
        updateDocumentNonBlocking(userProfileRef, { lastSeen: serverTimestamp() });
      }
    };

    // Update presence immediately and then every 60 seconds
    updatePresence();
    timerRef.current = setInterval(updatePresence, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, firestore]);
}
