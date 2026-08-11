export interface ModerationResult {
  isFlagged: boolean;
  category?: 'toxicity' | 'profanity' | 'harassment' | 'spam';
  reason?: string;
  severity?: 'low' | 'medium' | 'high';
}

// Common explicit/toxic keywords for fast client-side screening
const TOXIC_PATTERNS = [
  /\b(hate|stupid|idiot|loser|ugly|trash|scam)\b/i,
  /\b(kill|attack|die|destroy|threat)\b/i,
];

const SPAM_PATTERNS = [
  /(http|https):\/\/[^\s]+/gi, // Unverified link screening
  /(.)\1{6,}/,                // Character repetition spam (e.g., "hhhhhhh")
];

/**
 * Evaluates text against real-time safety rules.
 */
export async function moderateContent(text: string): Promise<ModerationResult> {
  const cleanText = text.trim();
  if (!cleanText) return { isFlagged: false };

  // 1. Spam & Excessive Repetition Check
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(cleanText)) {
      return {
        isFlagged: true,
        category: 'spam',
        reason: 'Message flagged for excessive repetition or unverified link patterns.',
        severity: 'low',
      };
    }
  }

  // 2. Harassment & Toxicity Check
  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(cleanText)) {
      return {
        isFlagged: true,
        category: 'toxicity',
        reason: 'Message contains potentially disrespectful or harmful wording.',
        severity: 'high',
      };
    }
  }

  return { isFlagged: false };
}