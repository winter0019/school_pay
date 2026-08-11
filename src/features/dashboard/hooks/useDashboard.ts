"use client";

import { useMemo } from "react";

import { useUserStore } from "@/store/userStore";

import { calculateProfileCompletion } from "../services/dashboardService";

export default function useDashboard() {
  const user = useUserStore((state) => state.user);

  const profileCompletion = useMemo(() => {
    if (!user) {
      return {
        score: 0,
        completed: 0,
        total: 8,
        missing: [],
      };
    }

    return calculateProfileCompletion(user);
  }, [user]);

  const aiMatchScore = useMemo(() => {
    if (!user) return 0;

    let score = 50;

    score += Math.min(user.interests.length * 5, 20);
    score += Math.min(user.goals.length * 5, 15);

    if (user.bio) score += 5;
    if (user.personality) score += 5;
    if (user.personalityDescription) score += 5;

    return Math.min(score, 100);
  }, [user]);

  const connectionCount = 0;

  return {
    user,

    profileCompletion,

    aiMatchScore,

    connectionCount,
  };
}