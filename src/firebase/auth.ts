import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type UserCredential,
} from "firebase/auth";

import { doc, getDoc, setDoc } from "firebase/firestore";

import { auth } from "./config";
import { db } from "./firestore";

const provider = new GoogleAuthProvider();

export type SignInResult = UserCredential & {
  isNewUser: boolean;
  onboardingCompleted: boolean;
};

export async function signInGoogle(): Promise<SignInResult> {
  const result = await signInWithPopup(auth, provider);

  const user = result.user;

  const ref = doc(db, "users", user.uid);

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,

      displayName: user.displayName ?? "",
      email: user.email ?? "",
      photoURL: user.photoURL ?? "",

      username: "",
      bio: "",

      country: "",
      language: "",

      interests: [],
      goals: [],

      personality: "",
      personalityDescription: "",

      onboardingCompleted: false,

      online: true,

      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSeen: Date.now(),
    });

    return {
      ...result,
      isNewUser: true,
      onboardingCompleted: false,
    };
  }

  const data = snap.data();

  return {
    ...result,
    isNewUser: false,
    onboardingCompleted: data?.onboardingCompleted ?? false,
  };
}

export async function logout() {
  await signOut(auth);
}