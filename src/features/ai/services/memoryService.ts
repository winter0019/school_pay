import { db } from '@/firebase/firestore';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export interface UserSessionMemory {
  id?: string;
  userId: string;
  userName: string;
  topic: string;
  keyTakeaway: string;
  actionItem: string;
  createdAt?: any;
}

/**
 * Retrieves the most recent session memory for a returning user.
 */
export async function getLatestUserMemory(userId: string): Promise<UserSessionMemory | null> {
  if (!userId || userId === 'guest_user') return null;

  try {
    const memQuery = query(
      collection(db, 'user_memories'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(memQuery);
    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();

    return {
      id: docSnap.id,
      userId: data.userId,
      userName: data.userName || 'Peer',
      topic: data.topic || 'General',
      keyTakeaway: data.keyTakeaway || '',
      actionItem: data.actionItem || '',
      createdAt: data.createdAt,
    };
  } catch (err) {
    console.warn('Memory retrieval non-fatal notice:', err);
    return null;
  }
}

/**
 * Saves a new cross-session memory after a completed circle session.
 */
export async function saveUserSessionMemory(
  memory: Omit<UserSessionMemory, 'id' | 'createdAt'>
): Promise<void> {
  try {
    await addDoc(collection(db, 'user_memories'), {
      ...memory,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to save session memory:', err);
  }
}

/**
 * Formats returning user memory into an organic AI Host welcome intro script.
 */
export function buildMemoryWelcomeSnippet(memory: UserSessionMemory): string {
  if (!memory.actionItem && !memory.keyTakeaway) return '';

  return (
    `Welcome back, ${memory.userName}! ` +
    `In your last ${memory.topic} session, your key takeaway was: "${memory.keyTakeaway}". ` +
    `You planned to work on: "${memory.actionItem}". ` +
    `How did that go since we last met?`
  );
}