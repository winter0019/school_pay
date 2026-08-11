import { db } from '@/firebase/firestore';
import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

export interface QueueEntry {
  id?: string;
  userId: string;
  userName: string;
  topic: string;
  mood: string;
  goal: string;
  status: 'waiting' | 'matched';
  roomId?: string;
  joinedAt?: any;
}

export async function joinQueue(entry: Omit<QueueEntry, 'status'>): Promise<string> {
  const queueRef = collection(db, 'queue');
  
  const newQueueDoc = await addDoc(queueRef, {
    ...entry,
    topic: entry.topic.toLowerCase().trim(),
    status: 'waiting',
    joinedAt: serverTimestamp(),
  });

  return newQueueDoc.id;
}

export async function checkForMatch(
  queueId: string,
  topic: string,
  currentUserId: string
): Promise<string | null> {
  try {
    const queueRef = collection(db, 'queue');
    const normalizedTopic = topic.toLowerCase().trim();

    const q = query(
      queueRef,
      where('topic', '==', normalizedTopic),
      where('status', '==', 'waiting')
    );
    const snapshot = await getDocs(q);

    const entries: (QueueEntry & { id: string })[] = [];
    snapshot.forEach((docSnap) => {
      entries.push({ id: docSnap.id, ...(docSnap.data() as QueueEntry) });
    });

    // Ensure distinct users only
    const matchedMembers: (QueueEntry & { id: string })[] = [];
    const seenUids = new Set<string>();

    for (const entry of entries) {
      if (!seenUids.has(entry.userId)) {
        seenUids.add(entry.userId);
        matchedMembers.push(entry);
      }
      if (matchedMembers.length === 3) break;
    }

    if (matchedMembers.length >= 2) {
      const memberUids = matchedMembers.map((m) => m.userId);
      const memberNames = matchedMembers.map((m) => m.userName || 'Peer User');

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const endTime = Date.now() + 30 * 60 * 1000;

      await setDoc(doc(db, 'rooms', roomId), {
        roomId,
        topic: normalizedTopic,
        memberUids,
        memberNames,
        startTime: serverTimestamp(),
        endTime: new Date(endTime),
        status: 'active',
        currentAiPrompt: 'Welcome everyone! Take 1 minute to introduce yourselves.',
      });

      // Cleanup matched queue entries
      for (const member of matchedMembers) {
        if (member.id) {
          await deleteDoc(doc(db, 'queue', member.id));
        }
      }

      return roomId;
    }

    return null;
  } catch (err) {
    console.error('Error during match check:', err);
    return null;
  }
}

export async function leaveQueue(queueId: string): Promise<void> {
  if (!queueId) return;
  try {
    await deleteDoc(doc(db, 'queue', queueId));
  } catch (err) {
    console.error('Failed to leave queue:', err);
  }
}