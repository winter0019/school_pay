import {
  doc,
  getDoc,
  type DocumentData,
} from "firebase/firestore";

import { db } from "@/firebase/firestore";

import type { ConversationPreview } from "../types";

export interface ConversationData {
  id: string;
  participantIds: string[];
  lastMessage?: string;
  lastMessageType?: string;
  lastSenderUid?: string;
  lastMessageAt?: any;
  unreadCount?: Record<string, number>;
  typing?: Record<string, boolean>;
  updatedAt?: any;
  [key: string]: any;
}

/**
 * Checks if a direct chat between currentUid and targetUid is allowed.
 * Requires an active accepted friend status document in `/friends/{pairKey}`
 */
export async function canStartDirectChat(
  currentUid: string,
  targetUid: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (!currentUid || !targetUid || currentUid === targetUid) {
    return { allowed: false, reason: "Invalid participants." };
  }

  // Create a deterministic pair key (e.g. uidA_uidB sorted alphabetically)
  const pairKey = [currentUid, targetUid].sort().join("_");
  const friendRef = doc(db, "friends", pairKey);
  const friendSnap = await getDoc(friendRef);

  if (!friendSnap.exists() || friendSnap.data()?.status !== "accepted") {
    return {
      allowed: false,
      reason: "You must send a friend request and have it accepted before starting a direct chat.",
    };
  }

  return { allowed: true };
}

export async function getConversation(
  conversationId: string
): Promise<ConversationData> {
  const ref = doc(
    db,
    "conversations",
    conversationId
  );

  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Conversation not found");
  }

  const data = snap.data() as DocumentData;

  return {
    id: snap.id,
    participantIds: data.participantIds || [],
    ...data,
  };
}

export async function getFriendProfile(
  conversationId: string,
  currentUid: string
) {
  const conversation =
    await getConversation(conversationId);

  const friendUid =
    conversation.participantIds.find(
      (uid: string) => uid !== currentUid
    );

  if (!friendUid) {
    throw new Error("Friend not found");
  }

  // Verify friendship status before returning profile details
  const friendCheck = await canStartDirectChat(currentUid, friendUid);
  if (!friendCheck.allowed) {
    throw new Error(friendCheck.reason || "Direct messaging is restricted until friend request is accepted.");
  }

  const userSnap = await getDoc(
    doc(db, "users", friendUid)
  );

  if (!userSnap.exists()) {
    throw new Error("User not found");
  }

  const user = userSnap.data();

  return {
    uid: friendUid,

    username: user.username ?? "",

    displayName:
      user.displayName ?? "Unknown",

    photoURL: user.photoURL ?? "",

    online: user.online ?? false,

    lastSeen: user.lastSeen ?? null,

    isFriend: true,
  };
}