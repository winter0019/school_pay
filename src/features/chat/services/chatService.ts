import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentReference,
} from "firebase/firestore";

import { db } from "@/firebase/firestore";

export async function getOrCreateConversation(
  uid1: string,
  uid2: string
): Promise<string> {
  const participantIds = [uid1, uid2].sort();

  const conversationId = participantIds.join("_");

  const ref = doc(db, "conversations", conversationId);

  try {
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await createConversationDoc(
        ref,
        participantIds,
        conversationId
      );
    }

    return conversationId;
  } catch (err: any) {
    // If Firestore denies reading because the document
    // doesn't exist yet, try creating it.
    if (err.code === "permission-denied") {
      console.log(
        "Conversation not found. Creating new conversation..."
      );

      await createConversationDoc(
        ref,
        participantIds,
        conversationId
      );

      return conversationId;
    }

    console.error("Firestore operation failed:", err);

    throw err;
  }
}

async function createConversationDoc(
  ref: DocumentReference,
  participantIds: string[],
  conversationId: string
) {
  await setDoc(ref, {
    // Participants
    participantIds,

    // Unique identifier
    conversationKey: conversationId,

    // Conversation metadata
    lastMessage: "",
    lastMessageType: "text",
    lastSenderUid: "",
    lastMessageAt: serverTimestamp(),

    // Per-user unread counter
    unreadCount: {
      [participantIds[0]]: 0,
      [participantIds[1]]: 0,
    },

    // Typing indicator
    typing: {
      [participantIds[0]]: false,
      [participantIds[1]]: false,
    },

    // Future features
    archivedBy: [],
    deletedFor: [],
    pinnedBy: [],
    mutedBy: [],

    // Timestamps
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  console.log("Conversation created:", conversationId);
}