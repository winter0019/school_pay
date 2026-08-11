import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  arrayUnion,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "@/firebase/firestore";
import type { Message, ReplyContext, MessageType } from "../types";

/* ----------------------------------------------------------
   Realtime Listener (Subcollection)
---------------------------------------------------------- */

export function subscribeToMessages(
  conversationId: string,
  callback: (messages: Message[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const messagesRef = collection(
    db,
    "conversations",
    conversationId,
    "messages"
  );

  const q = query(messagesRef, orderBy("createdAt", "asc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as DocumentData),
      })) as Message[];

      callback(messages);
    },
    (error) => {
      console.error("[subscribeToMessages] Listener error:", error);
      onError?.(error);
    }
  );
}

/* ----------------------------------------------------------
   Send Message (Atomic Batch)
---------------------------------------------------------- */

export async function sendMessage({
  conversationId,
  senderUid,
  receiverUid,
  text,
  type = "text",
  mediaUrl = "",
  thumbnailUrl = "",
  fileName = "",
  fileSize = 0,
  replyTo = null,
}: {
  conversationId: string;
  senderUid: string;
  receiverUid: string;
  text: string;
  type?: MessageType;
  mediaUrl?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: ReplyContext | null;
}) {
  const trimmed = text.trim();
  if (!trimmed && !mediaUrl) return;

  const batch = writeBatch(db);

  const messageRef = doc(
    collection(db, "conversations", conversationId, "messages")
  );

  // Format preview text for conversation list
  let previewText = trimmed;
  if (type === "image") previewText = "📷 Photo";
  else if (type === "video") previewText = "🎥 Video";
  else if (type === "audio") previewText = "🎙️ Voice message";
  else if (type === "file") previewText = `📄 ${fileName || "Document"}`;

  batch.set(messageRef, {
    conversationId,
    senderUid,
    receiverUid,
    text: trimmed,
    type,
    edited: false,
    deleted: false,
    mediaUrl,
    thumbnailUrl,
    fileName,
    fileSize,
    replyTo,
    reactions: {},
    seenBy: [senderUid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const conversationRef = doc(db, "conversations", conversationId);

  batch.update(conversationRef, {
    lastMessage: previewText,
    lastMessageType: type,
    lastSenderUid: senderUid,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    [`typing.${senderUid}`]: false,
    [`unreadCount.${receiverUid}`]: increment(1),
  });

  await batch.commit();
  return messageRef.id;
}

/* ----------------------------------------------------------
   Typing Indicator
---------------------------------------------------------- */

export async function updateTyping(
  conversationId: string,
  uid: string,
  typing: boolean
) {
  if (!conversationId || !uid) return;

  await updateDoc(doc(db, "conversations", conversationId), {
    [`typing.${uid}`]: typing,
  });
}

/* ----------------------------------------------------------
   Mark Conversation As Read
---------------------------------------------------------- */

export async function markConversationRead(
  conversationId: string,
  uid: string
) {
  if (!conversationId || !uid) return;

  await updateDoc(doc(db, "conversations", conversationId), {
    [`unreadCount.${uid}`]: 0,
    [`typing.${uid}`]: false,
  });
}

/* ----------------------------------------------------------
   Edit Message
---------------------------------------------------------- */

export async function editMessage({
  conversationId,
  messageId,
  senderUid,
  newText,
}: {
  conversationId: string;
  messageId: string;
  senderUid: string;
  newText: string;
}) {
  const messageRef = doc(
    db,
    "conversations",
    conversationId,
    "messages",
    messageId
  );

  const snap = await getDoc(messageRef);
  if (!snap.exists()) throw new Error("Message not found.");
  if (snap.data().senderUid !== senderUid) {
    throw new Error("Unauthorized to edit this message.");
  }

  await updateDoc(messageRef, {
    text: newText.trim(),
    edited: true,
    updatedAt: serverTimestamp(),
  });
}

/* ----------------------------------------------------------
   Delete Message (Soft Delete)
---------------------------------------------------------- */

export async function deleteMessage({
  conversationId,
  messageId,
  senderUid,
}: {
  conversationId: string;
  messageId: string;
  senderUid: string;
}) {
  const messageRef = doc(
    db,
    "conversations",
    conversationId,
    "messages",
    messageId
  );

  const snap = await getDoc(messageRef);
  if (!snap.exists()) throw new Error("Message not found.");
  if (snap.data().senderUid !== senderUid) {
    throw new Error("Unauthorized to delete this message.");
  }

  await updateDoc(messageRef, {
    text: "This message was deleted",
    deleted: true,
    mediaUrl: "",
    thumbnailUrl: "",
    updatedAt: serverTimestamp(),
  });
}

/* ----------------------------------------------------------
   React To Message
---------------------------------------------------------- */

export async function toggleReaction({
  conversationId,
  messageId,
  uid,
  emoji,
}: {
  conversationId: string;
  messageId: string;
  uid: string;
  emoji: string;
}) {
  const messageRef = doc(
    db,
    "conversations",
    conversationId,
    "messages",
    messageId
  );

  const snap = await getDoc(messageRef);
  if (!snap.exists()) throw new Error("Message not found.");

  const currentReactions: Record<string, string[]> = snap.data().reactions || {};
  const existingUsers = currentReactions[emoji] || [];

  const hasReacted = existingUsers.includes(uid);
  const updatedUsers = hasReacted
    ? existingUsers.filter((id) => id !== uid)
    : [...existingUsers, uid];

  if (updatedUsers.length > 0) {
    currentReactions[emoji] = updatedUsers;
  } else {
    delete currentReactions[emoji];
  }

  await updateDoc(messageRef, {
    reactions: currentReactions,
    updatedAt: serverTimestamp(),
  });
}