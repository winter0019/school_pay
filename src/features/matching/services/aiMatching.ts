export interface UserProfile {
  uid: string;
  username?: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  interests: string[];
  goals: string[];
  language?: string;
  country?: string;
  personality?: string;
  online?: boolean;
  [key: string]: any;
}

export interface MatchResult {
  score: number;
  reasons: string[];
}

function overlap(a: string[] = [], b: string[] = []) {
  const shared = a.filter((x) => b.includes(x));
  return {
    shared,
    count: shared.length,
  };
}

export function calculateMatch(
  current: UserProfile,
  other: UserProfile
): MatchResult {
  let score = 0;

  const reasons: string[] = [];

  // Interests (30)
  const interests = overlap(
    current.interests,
    other.interests
  );

  score += interests.count * 10;

  if (interests.shared.length)
    reasons.push(
      `Shared interests: ${interests.shared.join(", ")}`
    );

  // Goals (20)
  const goals = overlap(current.goals, other.goals);

  score += goals.count * 10;

  if (goals.shared.length)
    reasons.push(
      `Shared goals: ${goals.shared.join(", ")}`
    );

  // Language (15)
  if (
    current.language &&
    current.language === other.language
  ) {
    score += 15;

    reasons.push(
      `Both speak ${current.language}`
    );
  }

  // Country (10)
  if (
    current.country &&
    current.country === other.country
  ) {
    score += 10;

    reasons.push(
      `Both live in ${current.country}`
    );
  }

  // Personality (15)
  if (
    current.personality &&
    current.personality === other.personality
  ) {
    score += 15;

    reasons.push(
      `Compatible personalities`
    );
  }

  // Online bonus (5)
  if (other.online) {
    score += 5;
  }

  // Completed profile bonus (10)
  if (
    other.bio &&
    other.bio.length > 40
  ) {
    score += 10;
  }

  score = Math.min(score, 100);

  return {
    score,
    reasons,
  };
}