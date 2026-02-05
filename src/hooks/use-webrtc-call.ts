'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  doc,
  collection,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { CallSession } from '@/types';

const ICE_SERVERS: RTCConfiguration['iceServers'] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'connected' | 'ended' | 'declined';

export interface UseWebRTCCallOptions {
  firestore: Firestore | null;
  chatId: string | null;
  myUid: string | null;
  remoteUid: string | null;
  callType: 'voice' | 'video';
  /** Caller starts the call; callee receives. */
  isCaller: boolean;
  /** When true, we should listen for incoming call (callee) or have started outgoing (caller). */
  active: boolean;
}

export interface UseWebRTCCallReturn {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
  isMutedAudio: boolean;
  isMutedVideo: boolean;
  startCall: () => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  setMutedAudio: (muted: boolean) => void;
  setMutedVideo: (muted: boolean) => void;
}

function getOfferFromSession(data: CallSession): RTCSessionDescriptionInit | null {
  if (!data.offer) return null;
  return { type: data.offer.type as RTCSdpType, sdp: data.offer.sdp };
}

function getAnswerFromSession(data: CallSession): RTCSessionDescriptionInit | null {
  if (!data.answer) return null;
  return { type: data.answer.type as RTCSdpType, sdp: data.answer.sdp };
}

export function useWebRTCCall({
  firestore,
  chatId,
  myUid,
  remoteUid,
  callType,
  isCaller,
  active,
}: UseWebRTCCallOptions): UseWebRTCCallReturn {
  const [callState, setCallState] = useState<CallState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMutedAudio, setIsMutedAudio] = useState(false);
  const [isMutedVideo, setIsMutedVideo] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callUnsubRef = useRef<Unsubscribe | null>(null);
  const iceUnsubRef = useRef<Unsubscribe | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    if (callUnsubRef.current) {
      callUnsubRef.current();
      callUnsubRef.current = null;
    }
    if (iceUnsubRef.current) {
      iceUnsubRef.current();
      iceUnsubRef.current = null;
    }
  }, []);

  const endCall = useCallback(async () => {
    if (!firestore || !chatId) return;
    try {
      const callRef = doc(firestore, 'calls', chatId);
      await updateDoc(callRef, { status: 'ended' });
    } catch (_) {}
    cleanup();
    setCallState('ended');
  }, [firestore, chatId, cleanup]);

  const declineCall = useCallback(async () => {
    if (!firestore || !chatId) return;
    try {
      const callRef = doc(firestore, 'calls', chatId);
      await updateDoc(callRef, { status: 'ended' });
    } catch (_) {}
    cleanup();
    setCallState('declined');
  }, [firestore, chatId, cleanup]);

  const setMutedAudio = useCallback((muted: boolean) => {
    setIsMutedAudio(muted);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, []);

  const setMutedVideo = useCallback((muted: boolean) => {
    setIsMutedVideo(muted);
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !muted));
  }, []);

  const startCall = useCallback(async () => {
    if (!firestore || !chatId || !myUid || !remoteUid) {
      setError('Missing firestore or user IDs');
      return;
    }
    setError(null);
    setCallState('outgoing');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (ev) => {
        if (ev.streams[0]) setRemoteStream(ev.streams[0]);
      };
      pc.onicecandidate = (ev) => {
        if (!ev.candidate || !firestore || !chatId) return;
        const col = collection(firestore, 'calls', chatId, 'iceCandidates');
        addDoc(col, {
          fromUid: myUid,
          candidate: {
            candidate: ev.candidate.candidate,
            sdpMid: ev.candidate.sdpMid ?? null,
            sdpMLineIndex: ev.candidate.sdpMLineIndex ?? null,
          },
          createdAt: serverTimestamp(),
        }).catch(() => {});
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const callRef = doc(firestore, 'calls', chatId);
      await setDoc(callRef, {
        chatId,
        callerId: myUid,
        calleeId: remoteUid,
        callType,
        status: 'ringing',
        offer: { type: offer.type, sdp: offer.sdp },
        createdAt: serverTimestamp(),
      });

      iceUnsubRef.current = onSnapshot(
        collection(firestore, 'calls', chatId, 'iceCandidates'),
        (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            const d = change.doc.data();
            if (d.fromUid === myUid) return;
            const c = d.candidate;
            if (!c || !pcRef.current) return;
            pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          });
        }
      );

      callUnsubRef.current = onSnapshot(callRef, (snap) => {
        const data = snap.data() as CallSession | undefined;
        if (!data) return;
        if (data.status === 'ended') {
          cleanup();
          setCallState('ended');
          return;
        }
        const answer = getAnswerFromSession(data);
        if (answer && pcRef.current) {
          pcRef.current.setRemoteDescription(new RTCSessionDescription(answer)).then(() => {
            setCallState('connected');
          }).catch((e) => setError(e.message));
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start call');
      setCallState('idle');
      cleanup();
    }
  }, [firestore, chatId, myUid, remoteUid, callType, cleanup]);

  const acceptCall = useCallback(async () => {
    if (!firestore || !chatId || !myUid || !remoteUid) return;
    setError(null);

    try {
      const callRef = doc(firestore, 'calls', chatId);
      const snap = await getDoc(callRef);
      const data = snap.data() as CallSession | undefined;
      const offer = data ? getOfferFromSession(data) : null;
      if (!offer) {
        setError('No offer found');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (ev) => {
        if (ev.streams[0]) setRemoteStream(ev.streams[0]);
      };
      pc.onicecandidate = (ev) => {
        if (!ev.candidate || !firestore || !chatId) return;
        const col = collection(firestore, 'calls', chatId, 'iceCandidates');
        addDoc(col, {
          fromUid: myUid,
          candidate: {
            candidate: ev.candidate.candidate,
            sdpMid: ev.candidate.sdpMid ?? null,
            sdpMLineIndex: ev.candidate.sdpMLineIndex ?? null,
          },
          createdAt: serverTimestamp(),
        }).catch(() => {});
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await updateDoc(callRef, {
        answer: { type: answer.type, sdp: answer.sdp },
        status: 'connected',
      });
      setCallState('connected');

      callUnsubRef.current = onSnapshot(callRef, (snap) => {
        const data = snap.data() as CallSession | undefined;
        if (data?.status === 'ended') {
          cleanup();
          setCallState('ended');
        }
      });

      iceUnsubRef.current = onSnapshot(
        collection(firestore, 'calls', chatId, 'iceCandidates'),
        (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            const d = change.doc.data();
            if (d.fromUid === myUid) return;
            const c = d.candidate;
            if (!c || !pcRef.current) return;
            pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          });
        }
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get media');
      setCallState('idle');
      cleanup();
    }
  }, [firestore, chatId, myUid, remoteUid, callType, cleanup]);

  useEffect(() => {
    if (!active || !firestore || !chatId || !myUid) return;
    if (isCaller) return;

    const callRef = doc(firestore, 'calls', chatId);
    const unsub = onSnapshot(callRef, (snap) => {
      const data = snap.data() as CallSession | undefined;
      if (!data || data.calleeId !== myUid) return;
      if (data.status === 'ended') {
        setCallState('idle');
        return;
      }
      if (data.status === 'ringing' && data.offer) setCallState('incoming');
    });
    return () => {
      unsub();
    };
  }, [active, firestore, chatId, myUid, isCaller]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callState,
    localStream,
    remoteStream,
    error,
    isMutedAudio,
    isMutedVideo,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    setMutedAudio,
    setMutedVideo,
  };
}
