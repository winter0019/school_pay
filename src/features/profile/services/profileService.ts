import {
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "@/firebase/firestore";

export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));

  if (!snap.exists()) {
    return null;
  }

  return {
    uid,
    ...snap.data(),
  };
}