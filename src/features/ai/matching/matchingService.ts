import { db } from '@/firebase/firestore';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

export interface PeerProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  interests?: string[];
  compatibilityScore?: number;
  matchedInterests?: string[];
}

/**
 * Calculates compatibility score between current user and target peer
 */
export function calculateCompatibility(
  userInterests: string[] = [],
  peerInterests: string[] = []
): { score: number; matched: string[] } {
  if (!userInterests.length || !peerInterests.length) {
    return { score: 65, matched: [] }; // Baseline score
  }

  const userSet = new Set(userInterests.map((i) => i.toLowerCase()));
  const matched = peerInterests.filter((i) => userSet.has(i.toLowerCase()));

  // Base 50% + 15% for each matching interest (capped at 98%)
  const rawScore = 50 + matched.length * 15;
  const score = Math.min(Math.max(rawScore, 55), 98);

  return { score, matched };
}

/**
 * Fetches compatible peer suggestions for the current user
 */
export async function getSuggestedPeers(
  currentUid: string,
  currentUserInterests: string[] = []
): Promise<PeerProfile[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, limit(20));
    const querySnapshot = await getDocs(q);

    const peers: PeerProfile[] = [];

    querySnapshot.forEach((docSnap) => {
      if (docSnap.id === currentUid) return;

      const data = docSnap.data();
      const peerInterests: string[] = data.interests || ['Technology', 'Design', 'Media'];
      const { score, matched } = calculateCompatibility(currentUserInterests, peerInterests);

      peers.push({
        uid: docSnap.id,
        displayName: data.displayName || 'Anonymous Peer',
        photoURL: data.photoURL,
        bio: data.bio || 'Exploring new projects and collaborations.',
        interests: peerInterests,
        compatibilityScore: score,
        matchedInterests: matched,
      });
    });

    return peers.sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));
  } catch (err) {
    console.error('Failed to fetch suggested peers:', err);
    return [];
  }
}

/**
 * Generates personalized AI Icebreakers based on shared interests or profile bio
 */
export function generateIcebreakers(
  partnerName: string,
  matchedInterests: string[] = []
): string[] {
  const firstName = partnerName.split(' ')[0] || partnerName;

  if (matchedInterests.length > 0) {
    const primaryInterest = matchedInterests[0];
    return [
      `Hey ${firstName}! I saw we both share an interest in ${primaryInterest}. Working on anything cool lately?`,
      `Hi ${firstName}! What got you started with ${primaryInterest}?`,
      `Hey! Always great meeting someone into ${primaryInterest}. How is your week going?`,
    ];
  }

  return [
    `Hey ${firstName}! Hope you're having a great week. What projects are you currently working on?`,
    `Hi ${firstName}! Great to connect with you here.`,
    `Hey ${firstName}! How's your day treating you so far?`,
  ];
}