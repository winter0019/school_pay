import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';

export interface IncomingCallNotification {
  callId: string;
  conversationId: string;
  callerUid: string;
  callerName: string;
  receiverUid: string;
  type: 'audio' | 'video';
  offer: RTCSessionDescriptionInit;
  createdAt?: any;
}

export const incomingCallService = {
  async sendIncomingCall(params: {
    receiverUid: string;
    callId: string;
    conversationId: string;
    callerUid: string;
    callerName: string;
    type: 'audio' | 'video';
    offer: RTCSessionDescriptionInit;
  }): Promise<void> {
    const callRef = doc(db, 'users', params.receiverUid, 'incomingCalls', params.callId);
    await setDoc(callRef, {
      conversationId: params.conversationId,
      callerUid: params.callerUid,
      callerName: params.callerName,
      receiverUid: params.receiverUid,
      type: params.type,
      offer: params.offer,
      createdAt: serverTimestamp(),
    });
  },

  async clearIncomingCall(receiverUid: string, callId: string): Promise<void> {
    try {
      const callRef = doc(db, 'users', receiverUid, 'incomingCalls', callId);
      await deleteDoc(callRef);
    } catch (error) {
      console.warn('Failed to clear incoming call notification:', error);
    }
  },

  subscribeToIncomingCalls(
    userId: string,
    callback: (calls: IncomingCallNotification[]) => void
  ) {
    const callsRef = collection(db, 'users', userId, 'incomingCalls');
    return onSnapshot(
      callsRef,
      (snapshot) => {
        const calls: IncomingCallNotification[] = snapshot.docs.map((docSnap) => ({
          callId: docSnap.id,
          ...(docSnap.data() as Omit<IncomingCallNotification, 'callId'>),
        }));
        callback(calls);
      },
      (error) => {
        console.error('Incoming calls subscription error:', error);
      }
    );
  },
};