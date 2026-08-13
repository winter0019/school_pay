import { db } from '@/firebase/firestore';
import {
  collection,
  getDocs,
  query,
  where,
  setDoc,
  doc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

export interface UserAffinityProfile {
  userId: string;
  userName: string;
  topic: string;
  mood: 'great' | 'good' | 'okay' | 'sad' | 'stressed';
  philosophicalLens: 'stoic' | 'pragmatic' | 'humanist' | 'existential' | 'mindful' | 'open';
  psychologicalNeed: 'advice' | 'listen' | 'perspective' | 'experience' | 'accountability';
  language: string;
}

/**
 * Calculates psychological and philosophical compatibility between two user profiles (0.0 to 1.0).
 */
export function calculateAffinityScore(p1: UserAffinityProfile, p2: UserAffinityProfile): number {
  let score = 0;

  // 1. Core Topic & Language Compatibility (Mandatory Baseline: 40%)
  if (p1.topic.toLowerCase() !== p2.topic.toLowerCase()) return 0;
  if (p1.language !== p2.language) return 0;
  score += 0.4;

  // 2. Philosophical Alignment (25% Weight)
  if (p1.philosophicalLens === p2.philosophicalLens) {
    score += 0.25;
  } else if (
    (p1.philosophicalLens === 'stoic' && p2.philosophicalLens === 'mindful') ||
    (p1.philosophicalLens === 'existential' && p2.philosophicalLens === 'humanist')
  ) {
    score += 0.18;
  } else {
    score += 0.1;
  }

  // 3. Psychological State & Intent Balance (20% Weight)
  if (p1.psychologicalNeed === p2.psychologicalNeed) {
    score += 0.2;
  } else if (
    (p1.psychologicalNeed === 'advice' && p2.psychologicalNeed === 'experience') ||
    (p1.psychologicalNeed === 'listen' && p2.psychologicalNeed === 'perspective')
  ) {
    score += 0.2;
  } else {
    score += 0.1;
  }

  // 4. Mood Harmony (15% Weight)
  if (p1.mood === p2.mood) {
    score += 0.15;
  } else {
    score += 0.08;
  }

  return score;
}

/**
 * Scans the waiting queue and clusters users based on topic and affinity score.
 */
export async function findDeepAffinityMatch(topic: string, language: string = 'en'): Promise<string | null> {
  try {
    const queueRef = collection(db, 'queue');
    const normalizedTopic = topic.toLowerCase().trim();

    const q = query(
      queueRef,
      where('topic', '==', normalizedTopic),
      where('status', '==', 'waiting')
    );

    const snapshot = await getDocs(q);
    const waitingUsers: (UserAffinityProfile & { id: string })[] = [];

    snapshot.forEach((snap) => {
      const data = snap.data();
      waitingUsers.push({
        id: snap.id,
        userId: data.userId,
        userName: data.userName || 'Peer',
        topic: data.topic,
        mood: data.mood || 'okay',
        philosophicalLens: data.philosophicalLens || 'open',
        psychologicalNeed: data.goal || 'perspective',
        language: data.language || 'en',
      });
    });

    if (waitingUsers.length < 2) return null;

    let bestCluster: typeof waitingUsers = [];
    let highestAffinity = -1;

    for (let i = 0; i < waitingUsers.length; i++) {
      for (let j = i + 1; j < waitingUsers.length; j++) {
        const score = calculateAffinityScore(waitingUsers[i], waitingUsers[j]);

        if (score >= 0.65 && score > highestAffinity) {
          highestAffinity = score;
          bestCluster = [waitingUsers[i], waitingUsers[j]];

          for (let k = j + 1; k < waitingUsers.length; k++) {
            const score3_1 = calculateAffinityScore(waitingUsers[i], waitingUsers[k]);
            const score3_2 = calculateAffinityScore(waitingUsers[j], waitingUsers[k]);
            if (score3_1 >= 0.6 && score3_2 >= 0.6) {
              bestCluster.push(waitingUsers[k]);
              break;
            }
          }
        }
      }
    }

    if (bestCluster.length >= 2) {
      const roomId = `circle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const memberUids = bestCluster.map((m) => m.userId);
      const memberNames = bestCluster.map((m) => m.userName);

      const affinityPercentage = Math.round(highestAffinity * 100);
      const sharedLens = bestCluster[0].philosophicalLens;
      
      // Use the actual original display title passed into the function or fallback nicely
      const displayTopicTitle = topic; 

      const initialPrompt = `Welcome to your ${affinityPercentage}% Affinity Circle! You share a ${sharedLens.toUpperCase()} perspective. Take 1 minute each to share what brought you to this conversation today.`;

      await setDoc(doc(db, 'rooms', roomId), {
        roomId,
        topic: displayTopicTitle, // <-- Retains clean display formatting (e.g. "Mental Wellness & Stress")
        memberUids,
        memberNames,
        affinityScore: affinityPercentage,
        sharedLens,
        currentAiPrompt: initialPrompt,
        status: 'active',
        startTime: serverTimestamp(),
        endTime: new Date(Date.now() + 30 * 60 * 1000),
        createdAt: serverTimestamp(),
      });

      for (const member of bestCluster) {
        await deleteDoc(doc(db, 'queue', member.userId)).catch(() => null);
      }

      return roomId;
    }

    return null;
  } catch (err) {
    console.error('Affinity matching error:', err);
    return null;
  }
}