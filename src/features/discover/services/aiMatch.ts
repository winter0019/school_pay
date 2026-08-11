import type { UserProfile } from "@/types/user";

export interface MatchBreakdown {
  interests: number;
  goals: number;
  language: number;
  personality: number;
  country: number;
}

export interface MatchResult {
  score: number;
  reasons: string[];
  breakdown: MatchBreakdown;
}

function normalize(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

export function calculateMatch(
  currentUser: UserProfile,
  otherUser: UserProfile
): MatchResult {
  const breakdown: MatchBreakdown = {
    interests: 0,
    goals: 0,
    language: 0,
    personality: 0,
    country: 0,
  };

  const reasons: string[] = [];

  //------------------------------------
  // Interests (35)
  //------------------------------------

  const sharedInterests = currentUser.interests.filter((item) =>
    otherUser.interests.some(
      (x) => normalize(x) === normalize(item)
    )
  );

  breakdown.interests = Math.min(
    sharedInterests.length * 9,
    35
  );

  if (sharedInterests.length) {
    reasons.push(
      `Shared interests: ${sharedInterests.join(", ")}`
    );
  }

  //------------------------------------
  // Goals (25)
  //------------------------------------

  const sharedGoals = currentUser.goals.filter((item) =>
    otherUser.goals.some(
      (x) => normalize(x) === normalize(item)
    )
  );

  breakdown.goals = Math.min(
    sharedGoals.length * 9,
    25
  );

  if (sharedGoals.length) {
    reasons.push(
      `Shared goals: ${sharedGoals.join(", ")}`
    );
  }

  //------------------------------------
  // Language (15)
  //------------------------------------

  if (
    normalize(currentUser.language) ===
    normalize(otherUser.language)
  ) {
    breakdown.language = 15;

    reasons.push(
      `Both speak ${currentUser.language}`
    );
  }

  //------------------------------------
  // Personality (15)
  //------------------------------------

  if (
    normalize(currentUser.personality) ===
    normalize(otherUser.personality)
  ) {
    breakdown.personality = 15;

    reasons.push(
      "Compatible personalities"
    );
  }

  //------------------------------------
  // Country (10)
  //------------------------------------

  if (
    normalize(currentUser.country) ===
    normalize(otherUser.country)
  ) {
    breakdown.country = 10;

    reasons.push(
      `Both are from ${currentUser.country}`
    );
  }

  //------------------------------------
  // Calculate total
  //------------------------------------

  let score =
    breakdown.interests +
    breakdown.goals +
    breakdown.language +
    breakdown.personality +
    breakdown.country;

  // Small bonus for complete profiles
  if (otherUser.bio?.trim().length > 40) {
    score += 3;
  }

  if (otherUser.photoURL) {
    score += 2;
  }

  score = Math.min(score, 100);

  if (reasons.length === 0) {
    reasons.push(
      "AI found potential compatibility based on your overall profile."
    );
  }

  return {
    score,
    reasons: reasons.slice(0, 4),
    breakdown,
  };
}