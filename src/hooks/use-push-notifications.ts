'use client';

import { useCallback, useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

/** Request notification permission and persist preference. Actual FCM token/subscription can be added when backend sends push. */
export function usePushNotifications() {
  const { user } = useUser();
  const firestore = useFirestore();
  const profileRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'user_profiles', user.uid) : null),
    [firestore, user]
  );
  const { data: profile } = useDoc<{ pushEnabled?: boolean }>(profileRef);
  const [asking, setAsking] = useState(false);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    setAsking(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && profileRef) {
        updateDocumentNonBlocking(profileRef, { pushEnabled: true });
        return true;
      }
      return false;
    } finally {
      setAsking(false);
    }
  }, [profileRef]);

  const isSupported = typeof window !== 'undefined' && 'Notification' in window;
  const isGranted = isSupported && Notification.permission === 'granted';
  const isEnabled = profile?.pushEnabled === true || isGranted;

  return { requestPermission, isSupported, isGranted, isEnabled, asking };
}
