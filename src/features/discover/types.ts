import type { UserProfile } from "@/types/user";

export interface DiscoverUser {
  profile: UserProfile;

  matchScore: number;

  reasons: string[];

  breakdown: {
    interests: number;
    goals: number;
    language: number;
    personality: number;
    country: number;
  };
}