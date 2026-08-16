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

  /**
   * Compatibility cleanup method.
   *
   * The actual WebRTC peer connection and media stream should be
   * cleaned up by the component that owns them.
   *
   * This method intentionally remains available because older
   * page.tsx code calls callService.cleanup().
   */
  cleanup(): void {
    // Intentionally empty.
    // WebRTC resources are owned by the calling component.
  },

  /**
   * Start an outgoing call.
   *
   * NOTE:
   * WebRTC signaling/ICE handling should be performed by the
   * calling component or the dedicated WebRTC implementation.
   */
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
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: config.type === 'video',
    });

    return localStream;
  },

  /**
   * Answer an incoming call.
   */
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

    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: callType === 'video',
    });

    return localStream;
  },

  /**
   * Terminate the active call.
   */
  async terminateCall(conversationId: string): Promise<void> {
    await this.removeActiveCall(conversationId);
  },

  /**
   * Create the shared active-call document.
   */
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

  /**
   * Accept an active call.
   *
   * IMPORTANT:
   * The status is changed to "connected" here so the caller and
   * receiver both receive the same state through onSnapshot().
   */
  async acceptCall(
    conversationId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    await updateDoc(getActiveCallRef(conversationId), {
      answer,
      status: 'connected',
      answeredAt: serverTimestamp(),
    });
  },

  /**
   * Explicitly synchronize the active call status.
   */
  async updateActiveCallStatus(
    conversationId: string,
    status: 'ringing' | 'connected' | 'ending'
  ): Promise<void> {
    try {
      await updateDoc(getActiveCallRef(conversationId), {
        status,
      });
    } catch (error) {
      console.warn(
        'Failed to update active call status:',
        error
      );
    }
  },

  /**
   * Remove the active call document.
   */
  async removeActiveCall(
    conversationId: string
  ): Promise<void> {
    try {
      await deleteDoc(
        getActiveCallRef(conversationId)
      );
    } catch (error) {
      console.warn(
        'Active call already removed:',
        error
      );
    }
  },

  /**
   * Save call history.
   */
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

      durationSeconds:
        params.durationSeconds || 0,

      createdAt: serverTimestamp(),
    });

    return result.id;
  },

  /**
   * Listen to the active call document.
   *
   * This is the important listener for:
   *
   * ringing
   * connected
   * ending
   * deleted
   */
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
        console.error(
          'Active call subscription error:',
          error
        );

        callback(null);
      }
    );
  },

  /**
   * Subscribe to call history.
   */
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
            const aTime =
              a.createdAt?.seconds || 0;

            const bTime =
              b.createdAt?.seconds || 0;

            return bTime - aTime;
          });

        callback(calls);
      },
      (error) => {
        console.error(
          'Call history subscription error:',
          error
        );
      }
    );
  },

  /**
   * Remove stale ICE candidates.
   */
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

    try {
      const snapshot = await getDocs(
        candidatesRef
      );

      await Promise.all(
        snapshot.docs.map((candidate) =>
          deleteDoc(candidate.ref)
        )
      );
    } catch (error) {
      console.warn(
        'Failed to clear stale ICE candidates:',
        error
      );
    }
  },
};