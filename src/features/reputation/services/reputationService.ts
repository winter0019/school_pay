import { db } from '@/firebase/firestore';
import { doc, updateDoc, increment } from 'firebase/firestore';

export interface ReputationScores {
  helpfulnessScore: number;
  listeningScore: number;
  empathyScore: number;
  expertiseScore: number;
  overallRating: number;
}

/**
 * Updates a user's multi-dimensional reputation scores in Firestore based on post-session peer feedback.
 */
export async function updateUserReputation(
  targetUserId: string,
  feedback: {
    feltHeard: boolean;
    helpfulRating: number; // 1 to 5
    empatheticRating: number; // 1 to 5
  }
): Promise<void> {
  if (!targetUserId || targetUserId === 'guest_user') return;

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
    }).catch(() => null);
  } catch (err) {
    console.warn('Reputation update non-fatal notice:', err);
  }
}