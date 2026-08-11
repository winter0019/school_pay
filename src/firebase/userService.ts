import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

import { db } from "./firestore";
import type { UserProfile } from "@/types/user";

/**
 * Get a user profile
 */
export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    return snap.data() as UserProfile;
  } catch (error) {
    console.error("Failed to get user profile:", error);
    throw error;
  }
}

/**
 * Create a new user profile
 */
export async function createUserProfile(
  profile: UserProfile
): Promise<void> {
  try {
    const ref = doc(db, "users", profile.uid);

    await setDoc(ref, profile);
  } catch (error) {
    console.error("Failed to create user profile:", error);
    throw error;
  }
}

/**
 * Update any user fields
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  try {
    const ref = doc(db, "users", uid);

    await updateDoc(ref, {
      ...data,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Failed to update user profile:", error);
    throw error;
  }
}

/**
 * Complete onboarding
 */
export async function completeOnboarding(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  try {
    const ref = doc(db, "users", uid);

    await updateDoc(ref, {
      ...data,
      onboardingCompleted: true,
      updatedAt: Date.now(),
      lastSeen: Date.now(),
    });
  } catch (error) {
    console.error("Failed to complete onboarding:", error);
    throw error;
  }
}

/**
 * Mark user online
 */
export async function setUserOnline(uid: string): Promise<void> {
  try {
    const ref = doc(db, "users", uid);

    await updateDoc(ref, {
      online: true,
      lastSeen: Date.now(),
    });
  } catch (error) {
    console.error("Failed to set user online:", error);
    throw error;
  }
}

/**
 * Mark user offline
 */
export async function setUserOffline(uid: string): Promise<void> {
  try {
    const ref = doc(db, "users", uid);

    await updateDoc(ref, {
      online: false,
      lastSeen: Date.now(),
    });
  } catch (error) {
    console.error("Failed to set user offline:", error);
    throw error;
  }
}

/**
 * Delete a user profile
 */
export async function deleteUserProfile(uid: string): Promise<void> {
  try {
    const ref = doc(db, "users", uid);

    await deleteDoc(ref);
  } catch (error) {
    console.error("Failed to delete user profile:", error);
    throw error;
  }
}