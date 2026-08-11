import { db } from '@/firebase/firestore';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';

export interface ReputationScores {
  helpfulnessScore: number;
  listeningScore: number;
  empathyScore: number;
  expertiseScore: number;
  overallRating: number;
}

/**
 * Updates a user's multi-dimensional reputation scores based on post-session peer feedback.
 */
export async function updateUserReputation(
  targetUserId: string,
  feedback: {
    feltHeard: boolean;
    helpfulRating: number; // 1 to 5
    empatheticRating: number; // 1 to 5
  }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', targetUserId);
    const helpfulBoost = feedback.helpfulRating * 2;
    const listeningBoost = feedback.feltHeard ? 10 : 2;
    const empathyBoost = feedback.empatheticRating * 2;

    await updateDoc(userRef, {
      'reputation.helpfulnessScore': increment(helpfulBoost),
      'reputation.listeningScore': increment(listeningBoost),
      'reputation.empathyScore': increment(empathyBoost),
      'reputation.totalSessionsCount': increment(1),
    });
  } catch (err) {
    console.warn('Reputation update non-fatal:', err);
  }
}