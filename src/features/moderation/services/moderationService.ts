import { db } from '@/firebase/firestore';
import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

// Explicit pattern matching for prohibited words and profanity
const PROFANITY_PATTERN = /\b(fuck|f\*\*\*|shit|bitch|asshole|bastard|cunt|dick|pussy)\b/i;

export interface ModerationResult {
  isFlagged: boolean;
  cleanText: string;
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}

/**
 * Screens message text for profanity and community policy violations.
 */
export function checkMessageContent(text: string): ModerationResult {
  if (PROFANITY_PATTERN.test(text)) {
    // Redact profane terms with asterisks
    const cleanText = text.replace(PROFANITY_PATTERN, '****');
    return {
      isFlagged: true,
      cleanText,
      reason: 'Use of profane or explicit language.',
      severity: 'medium',
    };
  }

  return {
    isFlagged: false,
    cleanText: text,
  };
}

/**
 * Logs a content violation report to Firestore for Admin Review and updates safety score.
 */
export async function logModerationViolation(params: {
  roomId: string;
  flaggedUserUid: string;
  flaggedUserName: string;
  originalText: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}): Promise<void> {
  try {
    // 1. Create a document in /reports for the Admin Dashboard
    await addDoc(collection(db, 'reports'), {
      roomId: params.roomId,
      reportedUserUid: params.flaggedUserUid,
      reportedUserName: params.flaggedUserName,
      reportedByName: 'AI Moderator System',
      reason: `${params.reason} Original text: "${params.originalText}"`,
      severity: params.severity,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    // 2. Decrement user safety score in /users/{uid}
    const userRef = doc(db, 'users', params.flaggedUserUid);
    await updateDoc(userRef, {
      safetyScore: increment(-10),
      lastFlaggedAt: serverTimestamp(),
    }).catch(() => {
      // Non-blocking fallback if user document permissions are restricted
    });
  } catch (err) {
    console.error('Failed to log moderation violation:', err);
  }
}