import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/firebase/firestore";

import type { FriendProfile } from "../types";

export function subscribeToFriends(
  uid: string,
  callback: (friends: FriendProfile[]) => void
) {
  const q = query(
    collection(db, "friends"),
    where("users", "array-contains", uid)
  );

  return onSnapshot(q, async (snapshot) => {
    const friends = await Promise.all(
      snapshot.docs.map(async (friendDoc) => {
        const data = friendDoc.data();

        const friendUid = data.users.find(
          (id: string) => id !== uid
        );

        if (!friendUid) return null;

        const profileSnap = await getDoc(
          doc(db, "users", friendUid)
        );

        if (!profileSnap.exists()) return null;

        const profile = profileSnap.data();

        return {
          uid: friendUid,

          displayName: profile.displayName || "",

          username: profile.username || "",

          photoURL: profile.photoURL || "",

          bio: profile.bio || "",

          country: profile.country || "",

          online: profile.online || false,

          lastSeen: profile.lastSeen || 0,
        } as FriendProfile;
      })
    );

    callback(
      friends.filter(Boolean) as FriendProfile[]
    );
  });
}