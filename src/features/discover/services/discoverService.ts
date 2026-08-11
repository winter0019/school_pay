import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/firestore";

import type { UserProfile } from "@/types/user";
import type { DiscoverUser } from "../types";

import { calculateMatch } from "./aiMatch";

export async function getDiscoverUsers(
  currentUser: UserProfile
): Promise<DiscoverUser[]> {
  try {
    const q = query(
      collection(db, "users"),
      where("onboardingCompleted", "==", true)
    );

    const snapshot = await getDocs(q);

    const users: DiscoverUser[] = snapshot.docs
      .map((doc) => doc.data() as UserProfile)
      .filter((user) => user.uid !== currentUser.uid)
      .map((profile) => {
        const match = calculateMatch(currentUser, profile);

        return {
          profile,
          matchScore: match.score,
          reasons: match.reasons,
          breakdown: match.breakdown,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return users;
  } catch (error) {
    console.error("Failed to load discover users:", error);
    throw error;
  }
}