'use client';

import React, { useMemo, useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

type InitState =
  | { status: 'pending' }
  | { status: 'ready'; firebaseApp: import('firebase/app').FirebaseApp; auth: import('firebase/auth').Auth; firestore: import('firebase/firestore').Firestore }
  | { status: 'error'; error: unknown };

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [initState, setInitState] = useState<InitState>({ status: 'pending' });

  useEffect(() => {
    try {
      const services = initializeFirebase();
      setInitState({
        status: 'ready',
        firebaseApp: services.firebaseApp,
        auth: services.auth,
        firestore: services.firestore,
      });
    } catch (e) {
      console.error('Firebase initialization failed:', e);
      setInitState({ status: 'error', error: e });
    }
  }, []);

  const providerProps = useMemo(() => {
    if (initState.status === 'ready') {
      return {
        firebaseApp: initState.firebaseApp,
        auth: initState.auth,
        firestore: initState.firestore,
      };
    }
    return { firebaseApp: null, auth: null, firestore: null };
  }, [initState]);

  return (
    <FirebaseProvider
      firebaseApp={providerProps.firebaseApp}
      auth={providerProps.auth}
      firestore={providerProps.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}