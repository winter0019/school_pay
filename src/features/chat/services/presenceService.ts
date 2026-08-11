import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/firebase/firestore";

export interface UserPresence {
  uid: string;
  online: boolean;
  lastSeen: any;
}

/* ----------------------------------------------------------
   Initialize User Presence (Heartbeat & Tab Listeners)
---------------------------------------------------------- */
export function initUserPresence(uid: string): () => void {
  if (!uid) return () => {};

  const userPresenceRef = doc(db, "user_presence", uid);
  const userRef = doc(db, "users", uid);

  const setOnline = async () => {
    const data = {
      uid,
      online: true,
      lastSeen: serverTimestamp(),
    };
    await setDoc(userPresenceRef, data, { merge: true });
    await setDoc(userRef, { online: true, lastSeen: serverTimestamp() }, { merge: true });
  };

  const setOffline = async () => {
    const data = {
      uid,
      online: false,
      lastSeen: serverTimestamp(),
    };
    await setDoc(userPresenceRef, data, { merge: true });
    await setDoc(userRef, { online: false, lastSeen: serverTimestamp() }, { merge: true });
  };

  // Set online immediately
  setOnline();

  // Tab visibility listener
  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      setOffline();
    } else {
      setOnline();
    }
  };

  // Window unload listener
  const handleBeforeUnload = () => {
    setOffline();
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handleBeforeUnload);

  // Return cleanup function
  return () => {
    setOffline();
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}

/* ----------------------------------------------------------
   Subscribe to Target User's Online Presence
---------------------------------------------------------- */
export function subscribeToPresence(
  uid: string,
  callback: (presence: UserPresence | null) => void
): Unsubscribe {
  if (!uid) return () => {};

  const userPresenceRef = doc(db, "user_presence", uid);

  return onSnapshot(
    userPresenceRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as UserPresence);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("[subscribeToPresence] Error listening to presence:", error);
    }
  );
}