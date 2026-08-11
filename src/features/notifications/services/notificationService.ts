import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/firestore";

export function subscribeToFriendRequests(
  uid: string,
  callback: (requests: any[]) => void
) {
  const q = query(
    collection(db, "friend_requests"),
    where("receiverUid", "==", uid),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, async (snapshot) => {
    const requests = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const request = docSnap.data();

        const userSnap = await getDoc(
          doc(db, "users", request.senderUid)
        );

        const sender = userSnap.exists()
          ? userSnap.data()
          : {};

        return {
          id: docSnap.id,
          ...request,

          senderDisplayName:
            sender.displayName || "Unknown User",

          senderUsername:
            sender.username || "",

          senderPhotoURL:
            sender.photoURL || "",

          senderCountry:
            sender.country || "",

          senderBio:
            sender.bio || "",
        };
      })
    );

    callback(requests);
  });
}