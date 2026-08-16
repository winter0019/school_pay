import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';

export interface QueueEntry {
  id?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  topic?: string;
  status: 'waiting' | 'matched';
  createdAt?: any;
}

export const queueService = {
  /**
   * Joins the matching queue
   */
  async joinQueue(entry: QueueEntry): Promise<void> {
    const queueRef = doc(db, 'queue', entry.userId);
    await setDoc(queueRef, {
      ...entry,
      createdAt: serverTimestamp(),
    }, { merge: true });
  },

  /**
   * Leaves the matching queue
   */
  async leaveQueue(queueId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'queue', queueId));
    } catch (err) {
      console.error('Failed to leave queue:', err);
    }
  },

  /**
   * Subscribes to the active queue members
   */
  subscribeToQueue(callback: (entries: QueueEntry[]) => void) {
    const q = query(collection(db, 'queue'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const entries: QueueEntry[] = [];
      snapshot.forEach((docSnap) => {
        entries.push({ id: docSnap.id, ...docSnap.data() } as QueueEntry);
      });
      callback(entries);
    }, (error) => {
      console.warn('Queue subscription error:', error);
    });
  }
};