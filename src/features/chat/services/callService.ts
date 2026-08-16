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

const getConversationId = (uidA: string, uidB: string): string => {
  return [uidA, uidB].sort().join('_');
};

const getActiveCallRef = (conversationId: string) => {
  return doc(
    db,
    'conversations',
    conversationId,
    'calls',
    'active_call'
  );
};

export const callService = {
  getConversationId,

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
    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
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
    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: true,
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
    await setDoc(
      getActiveCallRef(params.conversationId),
      {
        callerUid: params.callerUid,
        receiverUid: params.receiverUid,
        type: params.type,
        status: 'ringing',
        offer: params.offer,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + CALL_TIMEOUT_MS),
      }
    );
  },

  async acceptCall(
    conversationId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    await updateDoc(
      getActiveCallRef(conversationId),
      {
        answer,
        status: 'connected',
        answeredAt: serverTimestamp(),
      }
    );
  },

  async updateActiveCallStatus(
    conversationId: string,
    status: 'ringing' | 'connected' | 'ending'
  ): Promise<void> {
    await updateDoc(
      getActiveCallRef(conversationId),
      {
        status,
      }
    );
  },

  async removeActiveCall(
    conversationId: string
  ): Promise<void> {
    try {
      await deleteDoc(
        getActiveCallRef(conversationId)
      );
    } catch (error) {
      console.warn('Active call already removed:', error);
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
    const callsRef = collection(
      db,
      'conversations',
      params.conversationId,
      'calls'
    );

    const result = await addDoc(
      callsRef,
      {
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
      }
    );

    return result.id;
  },

  subscribeToActiveCall(
    conversationId: string,
    callback: (call: ActiveCall | null) => void
  ) {
    return onSnapshot(
      getActiveCallRef(conversationId),
      (snapshot) => {
        if (!snapshot.exists()) {
          callback(null);
          return;
        }

        callback({
          callId: snapshot.id,
          conversationId,
          ...(snapshot.data() as Omit<
            ActiveCall,
            'callId' | 'conversationId'
          >),
        });
      },
      (error) => {
        console.error('Active call subscription error:', error);
        callback(null);
      }
    );
  },

  subscribeToCallHistory(
    conversationId: string,
    callback: (calls: CallHistory[]) => void
  ) {
    return onSnapshot(
      collection(
        db,
        'conversations',
        conversationId,
        'calls'
      ),
      (snapshot) => {
        const calls = snapshot.docs
          .map((item) => ({
            callId: item.id,
            conversationId,
            ...(item.data() as Omit<
              CallHistory,
              'callId' | 'conversationId'
            >),
          }))
          .filter(
            (call) =>
              (call as any).recordType === 'history'
          )
          .sort((a: any, b: any) => {
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
          });

        callback(calls);
      },
      (error) => {
        console.error('Call history subscription error:', error);
      }
    );
  },

  async clearStaleCandidates(
    conversationId: string,
    callId = 'active_call'
  ): Promise<void> {
    const candidatesRef = collection(
      db,
      'conversations',
      conversationId,
      'calls',
      callId,
      'candidates'
    );

    const snapshot = await getDocs(candidatesRef);

    await Promise.all(
      snapshot.docs.map((candidate) =>
        deleteDoc(candidate.ref)
      )
    );
  },
};