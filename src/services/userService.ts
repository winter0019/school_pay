import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

import { db } from "@/firebase/firestore";

import { UserProfile } from "@/types/user";

export async function getUser(uid: string) {
  const ref = doc(db, "users", uid);

  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return snap.data() as UserProfile;
}

export async function createUser(profile: UserProfile) {
  await setDoc(doc(db, "users", profile.uid), profile);
}

export async function updateUser(uid: string, data: Partial<UserProfile>) {
  await updateDoc(doc(db, "users", uid), data);
}
