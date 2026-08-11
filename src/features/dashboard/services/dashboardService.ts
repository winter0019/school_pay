import type { UserProfile } from "@/types/user";

export interface ProfileCompletionResult {
  score: number;
  completed: number;
  total: number;
  missing: string[];
}

export function calculateProfileCompletion(
  user: UserProfile
): ProfileCompletionResult {
  const checks = [
    {
      field: "Username",
      ok: user.username.trim().length > 0,
    },
    {
      field: "Bio",
      ok: user.bio.trim().length > 0,
    },
    {
      field: "Country",
      ok: user.country.trim().length > 0,
    },
    {
      field: "Language",
      ok: user.language.trim().length > 0,
    },
    {
      field: "Interests",
      ok: user.interests.length > 0,
    },
    {
      field: "Goals",
      ok: user.goals.length > 0,
    },
    {
      field: "Personality",
      ok: user.personality.trim().length > 0,
    },
    {
      field: "About Me",
      ok: user.personalityDescription.trim().length > 0,
    },
  ];

  const completed = checks.filter((c) => c.ok).length;
  const total = checks.length;

  return {
    score: Math.round((completed / total) * 100),
    completed,
    total,
    missing: checks
      .filter((c) => !c.ok)
      .map((c) => c.field),
  };
}