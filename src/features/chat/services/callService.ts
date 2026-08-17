import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/firebase/firestore';

export type CallType = 'audio' | 'video';

export type CallDirection = 'outgoing' | 'incoming';

export type CallStatus =
  | 'ringing'
  | 'accepted'
  | 'rejected'
  | 'missed'
  | 'cancelled'
  | 'failed'
  | 'ended';

export interface ActiveCall {
  callId: string;
  conversationId: string;
  callerUid: string;
  receiverUid: string;
  type: CallType;
  status: 'ringing' | 'connected' | 'ending';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  createdAt?: any;
  expiresAt?: any;
  answeredAt?: any;
}

export interface CallHistory {
  callId: string;
  conversationId: string;
  callerUid: string;
  receiverUid: string;
  type: CallType;
  direction: CallDirection;
  status: CallStatus;
  startedAt?: any;
  answeredAt?: any;
  endedAt?: any;
  durationSeconds?: number;
  createdAt?: any;
}

export const CALL_TIMEOUT_MS = 30_000;

/**
 * ICE / WebRTC configuration using Metered TURN and Google STUN servers.
 */
export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    // Google public STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },

    // Metered TURN server configuration loaded from environment variables
    ...(typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_TURN_URL &&
    process.env.NEXT_PUBLIC_TURN_USERNAME &&
    process.env.NEXT_PUBLIC_TURN_CREDENTIAL
      ? [
          {
            urls: [
              process.env.NEXT_PUBLIC_TURN_URL,
              process.env.NEXT_PUBLIC_TURN_URL.replace(/^turn:/, 'turns:'),
            ],
            username: process.env.NEXT_PUBLIC_TURN_USERNAME,
            credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
          },
        ]
      : []),
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

/**
 * Create a properly configured RTCPeerConnection with Metered TURN support.
 */
export const createPeerConnection = (
  onRemoteStream?: (stream: MediaStream) => void,
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
): RTCPeerConnection => {
  const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);

  peerConnection.ontrack = (event) => {
    console.log('[WebRTC] Remote track received:', event.track.kind);
    let remoteStream = event.streams?.[0];
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteStream.addTrack(event.track);
    }
    onRemoteStream?.(remoteStream);
  };

  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection.connectionState;
    console.log('[WebRTC] connection state:', state);
    onConnectionStateChange?.(state);
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log('[WebRTC] ICE connection state:', peerConnection.iceConnectionState);
    if (peerConnection.iceConnectionState === 'failed') {
      console.error('[WebRTC] ICE failed. Verifying TURN server relay routing.');
    }
  };

  peerConnection.onicegatheringstatechange = () => {
    console.log('[WebRTC] ICE gathering state:', peerConnection.iceGatheringState);
  };

  peerConnection.onsignalingstatechange = () => {
    console.log('[WebRTC] signaling state:', peerConnection.signalingState);
  };

  return peerConnection;
};

const getConversationId = (uidA: string, uidB: string): string => {
  return [uidA, uidB].sort().join('_');
};

const getActiveCallRef = (conversationId: string) => {
  return doc(db, 'conversations', conversationId, 'calls', 'active_call');
};

export const callService = {
  getConversationId,
  createPeerConnection,

  cleanup(): void {},

  async startCall(config: {
    conversationId: string;
    currentUserUid: string;
    currentUserName: string;
    peerUid: string;
    type: CallType;
    onRemoteStream: (stream: MediaStream) => void;
    onCallEnded: () => void;
    onCallConnected: () => void;
  }): Promise<MediaStream> {
    console.log('[WebRTC] Starting local media:', config.type);
    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: config.type === 'video',
    });
    return localStream;
  },

  async answerCall(config: {
    conversationId: string;
    currentUserUid: string;
    currentUserName?: string;
    peerUid?: string;
    type?: CallType;
    onRemoteStream: (stream: MediaStream) => void;
    onCallEnded: () => void;
    onCallConnected: () => void;
  }): Promise<MediaStream> {
    const callType = config.type || 'audio';
    console.log('[WebRTC] Answering call:', callType);
    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: callType === 'video',
    });
    return localStream;
  },

  async terminateCall(conversationId: string): Promise<void> {
    await this.removeActiveCall(conversationId);
  },

  async createCall(params: {
    conversationId: string;
    callerUid: string;
    receiverUid: string;
    type: CallType;
    offer: RTCSessionDescriptionInit;
  }): Promise<void> {
    await setDoc(getActiveCallRef(params.conversationId), {
      callerUid: params.callerUid,
      receiverUid: params.receiverUid,
      type: params.type,
      status: 'ringing',
      offer: params.offer,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + CALL_TIMEOUT_MS),
    });
  },

  async acceptCall(conversationId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    await updateDoc(getActiveCallRef(conversationId), {
      answer,
      status: 'connected',
      answeredAt: serverTimestamp(),
    });
  },

  async updateActiveCallStatus(
    conversationId: string,
    status: 'ringing' | 'connected' | 'ending'
  ): Promise<void> {
    try {
      await updateDoc(getActiveCallRef(conversationId), { status });
    } catch (error) {
      console.warn('[WebRTC] Failed to update active call status:', error);
    }
  },

  async removeActiveCall(conversationId: string): Promise<void> {
    try {
      await deleteDoc(getActiveCallRef(conversationId));
    } catch (error) {
      console.warn('[WebRTC] Active call already removed:', error);
    }
  },

  async writeCallHistory(params: {
    conversationId: string;
    callerUid: string;
    receiverUid: string;
    type: CallType;
    direction: CallDirection;
    status: CallStatus;
    startedAt?: Date;
    answeredAt?: Date;
    endedAt?: Date;
    durationSeconds?: number;
  }): Promise<string> {
    const callsRef = collection(db, 'conversations', params.conversationId, 'calls');
    const result = await addDoc(callsRef, {
      recordType: 'history',
      callerUid: params.callerUid,
      receiverUid: params.receiverUid,
      type: params.type,
      direction: params.direction,
      status: params.status,
      startedAt: params.startedAt || null,
      answeredAt: params.answeredAt || null,
      endedAt: params.endedAt || null,
      durationSeconds: params.durationSeconds || 0,
      createdAt: serverTimestamp(),
    });
    return result.id;
  },

  subscribeToActiveCall(conversationId: string, callback: (call: ActiveCall | null) => void) {
    return onSnapshot(
      getActiveCallRef(conversationId),
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }
        const data = snapshot.data();
        callback({
          callId: snapshot.id,
          conversationId,
          callerUid: data.callerUid,
          receiverUid: data.receiverUid,
          type: data.type,
          status: data.status,
          offer: data.offer,
          answer: data.answer,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          answeredAt: data.answeredAt,
        });
      },
      (error) => {
        console.error('[WebRTC] Active call subscription error:', error);
        callback(null);
      }
    );
  },

  subscribeToCallHistory(conversationId: string, callback: (calls: CallHistory[]) => void) {
    return onSnapshot(
      collection(db, 'conversations', conversationId, 'calls'),
      (snapshot) => {
        const calls = snapshot.docs
          .map((item) => ({
            callId: item.id,
            conversationId,
            ...(item.data() as Omit<CallHistory, 'callId' | 'conversationId'>),
          }))
          .filter((call) => (call as any).recordType === 'history')
          .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        callback(calls);
      },
      (error) => {
        console.error('[WebRTC] Call history subscription error:', error);
      }
    );
  },

  async clearStaleCandidates(conversationId: string, callId = 'active_call'): Promise<void> {
    const candidatesRef = collection(db, 'conversations', conversationId, 'calls', callId, 'candidates');
    try {
      const snapshot = await getDocs(candidatesRef);
      await Promise.all(snapshot.docs.map((candidate) => deleteDoc(candidate.ref)));
    } catch (error) {
      console.warn('[WebRTC] Failed to clear stale ICE candidates:', error);
    }
  },
};