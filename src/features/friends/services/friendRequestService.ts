import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/firestore";

export type FriendRequestResult =
  | "sent"
  | "pending"
  | "friends";

export async function sendFriendRequest(
  senderUid: string,
  receiverUid: string
): Promise<FriendRequestResult> {
  if (senderUid === receiverUid) {
    throw new Error("You cannot send a request to yourself.");
  }

  // --------------------------------------------------
  // Check if they are already friends
  // --------------------------------------------------

  const friendsQuery = query(
    collection(db, "friends"),
    where("users", "array-contains", senderUid)
  );

  const friendsSnapshot = await getDocs(friendsQuery);

  const alreadyFriends = friendsSnapshot.docs.some((doc) => {
    const data = doc.data();

    return (
      Array.isArray(data.users) &&
      data.users.includes(receiverUid)
    );
  });

  if (alreadyFriends) {
    return "friends";
  }

  // --------------------------------------------------
  // Check for existing pending request
  // --------------------------------------------------

  const pendingQuery = query(
    collection(db, "friend_requests"),
    where("senderUid", "==", senderUid),
    where("receiverUid", "==", receiverUid),
    where("status", "==", "pending")
  );

  const pendingSnapshot = await getDocs(pendingQuery);

  if (!pendingSnapshot.empty) {
    return "pending";
  }

  // --------------------------------------------------
  // Create new request
  // --------------------------------------------------

  await addDoc(collection(db, "friend_requests"), {
    senderUid,
    receiverUid,

    status: "pending",

    createdAt: serverTimestamp(),

    updatedAt: serverTimestamp(),
  });

  return "sent";
}