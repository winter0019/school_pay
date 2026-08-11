import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/firebase/firestore";

export async function sendFriendRequest(
  senderUid: string,
  receiverUid: string
) {
  if (senderUid === receiverUid) {
    throw new Error("You cannot send a request to yourself.");
  }

  const requestId = `${senderUid}_${receiverUid}`;

  const ref = doc(db, "friend_requests", requestId);

  const existing = await getDoc(ref);

  if (existing.exists()) {
    throw new Error("Request already pending.");
  }

  await setDoc(ref, {
    senderUid,
    receiverUid,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}