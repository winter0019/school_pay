import type { Timestamp } from "firebase/firestore";

/* ==========================================
   Message Types
========================================== */

export type MessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "voice"
  | "file"
  | "location"
  | "contact"
  | "system"
  | "ai";

/* ==========================================
   Reply Context
========================================== */

export interface ReplyContext {
  messageId: string;
  senderUid: string;
  senderName?: string;
  text?: string;
  mediaUrl?: string;
  type?: MessageType;
}

/* ==========================================
   Chat User
========================================== */

export interface ChatUser {
  uid: string;

  username: string;

  displayName: string;

  photoURL: string;

  online: boolean;

  country?: string;

  language?: string;

  lastSeen?: Timestamp;
}

/* ==========================================
   Conversation (Firestore)
========================================== */

export interface Conversation {
  id: string;

  participantIds: string[];

  conversationKey: string;

  lastMessage: string;

  lastMessageType: MessageType;

  lastSenderUid: string;

  lastMessageAt: Timestamp;

  unreadCount: Record<string, number>;

  typing: Record<string, boolean>;

  archivedBy: string[];

  deletedFor: string[];

  pinnedBy: string[];

  mutedBy: string[];

  createdAt: Timestamp;

  updatedAt: Timestamp;
}

/* ==========================================
   Message Attachment
========================================== */

export interface MessageAttachment {
  url: string;

  name?: string;

  size?: number;

  mimeType?: string;

  thumbnail?: string;
}

/* ==========================================
   Message
========================================== */

export interface Message {
  id: string;

  conversationId: string;

  senderUid: string;

  receiverUid: string;

  text: string;

  type: MessageType;

  attachment?: MessageAttachment;

  edited: boolean;

  deleted: boolean;

  replyTo?: string | ReplyContext | null;

  reactions: Record<string, string>;

  seenBy: string[];

  deliveredTo?: string[];

  createdAt: Timestamp;

  updatedAt: Timestamp;
}

/* ==========================================
   Conversation Preview
========================================== */

export interface ConversationPreview
  extends Conversation {

  friend: ChatUser;
}

/* ==========================================
   Typing State
========================================== */

export interface TypingState {
  conversationId: string;

  uid: string;

  typing: boolean;
}

/* ==========================================
   Send Message Payload
========================================== */

export interface SendMessagePayload {
  conversationId: string;

  senderUid: string;

  receiverUid: string;

  text: string;

  type?: MessageType;

  attachment?: MessageAttachment;

  replyTo?: string | ReplyContext | null;
}