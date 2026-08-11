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
  };
}