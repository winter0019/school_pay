import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/firebase/firestore";

export async function acceptFriendRequest(requestId: string) {
  const requestRef = doc(db, "friend_requests", requestId);

  const snap = await getDoc(requestRef);

  if (!snap.exists()) {
    throw new Error("Friend request not found.");
  }

  const request = snap.data();

  // Prevent accepting twice
  if (request.status === "accepted") {
    return;
  }

  await updateDoc(requestRef, {
    status: "accepted",
    acceptedAt: serverTimestamp(),
  });

  const friendshipId = [request.senderUid, request.receiverUid]
    .sort()
    .join("_");

  await setDoc(doc(db, "friends", friendshipId), {
    users: [request.senderUid, request.receiverUid],
    createdAt: serverTimestamp(),
  });
}

export async function declineFriendRequest(requestId: string) {
  await deleteDoc(doc(db, "friend_requests", requestId));
}