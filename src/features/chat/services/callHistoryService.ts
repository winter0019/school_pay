import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firestore';

export interface LogCallParams {
  conversationId: string;
  callerUid: string;
  callerName: string;
  receiverUid: string;
  type: 'audio' | 'video';
  direction: 'outgoing' | 'incoming';
  status: 'accepted' | 'missed' | 'rejected' | 'cancelled';
}

export class CallHistoryService {
  /**
   * Logs a completed or missed call event to Firestore
   */
  async logCall({
    conversationId,
    callerUid,
    callerName,
    receiverUid,
    type,
    direction,
    status,
  }: LogCallParams) {
    try {
      const callsRef = collection(db, 'conversations', conversationId, 'calls');
      await addDoc(callsRef, {
        recordType: 'history',
        callerUid,
        callerName,
        receiverUid,
        type,
        direction,
        status,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.warn('Failed to log call history:', error);
    }
  }

  /**
   * Subscribes to call history logs for a specific conversation
   */
  subscribeToCallHistory(conversationId: string, onUpdate: (history: any[]) => void) {
    const callsRef = collection(db, 'conversations', conversationId, 'calls');
    const q = query(callsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const records = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((call: any) => call.recordType === 'history');
      onUpdate(records);
    }, (error) => {
      console.warn('Call history subscription error:', error);
      onUpdate([]);
    });
  }
}

export const callHistoryService = new CallHistoryService();