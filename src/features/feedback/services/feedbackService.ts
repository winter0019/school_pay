import { db } from '@/firebase/firestore';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface FeedbackData {
  roomId?: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5
  feltHeard: boolean;
  wouldJoinAgain: 'definitely' | 'maybe' | 'no';
  comment?: string;
}

/**
 * Saves post-session peer feedback and room rating to Firestore.
 */
export async function submitFeedback(data: FeedbackData): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'feedback'), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('Failed to submit session feedback:', err);
    throw err;
  }
}