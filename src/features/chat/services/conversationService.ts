import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';

export interface SendMessageParams {
  conversationId: string;
  senderUid: string;
  senderName: string;
  text?: string;
  attachment?: {
    type: 'image' | 'file';
    url: string;
    name: string;
    size?: number;
    contentType?: string;
  };
}

export class ConversationService {
  /**
   * Subscribes to real-time messages for a conversation
   */
  subscribeToMessages(conversationId: string, onMessagesUpdate: (messages: any[]) => void) {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      onMessagesUpdate(list);
    }, (error) => {
      console.warn('Messages subscription error:', error);
    });
  }

  /**
   * Sends a message or file attachment and updates the parent conversation metadata
   */
  async sendMessage({ conversationId, senderUid, senderName, text = '', attachment }: SendMessageParams) {
    if (!text.trim() && !attachment) return;

    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    
    // Explicitly map attachment properties to guarantee clean Firestore serialization
    const sanitizedAttachment = attachment ? {
      type: attachment.type,
      url: attachment.url || '',
      name: attachment.name || 'Attachment',
      size: typeof attachment.size === 'number' ? attachment.size : 0,
      contentType: attachment.contentType || 'application/octet-stream',
    } : null;

    await addDoc(messagesRef, {
      conversationId,
      senderUid,
      senderName,
      text: text.trim(),
      attachment: sanitizedAttachment,
      createdAt: serverTimestamp(),
    });

    const summaryText = text.trim() 
      ? text.trim() 
      : sanitizedAttachment?.type === 'image' 
      ? '📷 Image' 
      : `📎 ${sanitizedAttachment?.name || 'Attachment'}`;

    const convRef = doc(db, 'conversations', conversationId);
    await setDoc(
      convRef,
      {
        lastMessage: summaryText,
        lastMessageType: sanitizedAttachment ? sanitizedAttachment.type : 'text',
        lastSenderUid: senderUid,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export const conversationService = new ConversationService();

export const canStartDirectChat = async (userId: string, peerId: string): Promise<{ allowed: boolean }> => {
  return { allowed: true };
};

export const getFriendProfile = async (conversationId: string, currentUid: string): Promise<any> => {
  try {
    const uids = conversationId.split('_');
    const friendUid = uids.find((id) => id !== currentUid) || uids[0];

    if (friendUid) {
      const userDoc = await getDoc(doc(db, 'users', friendUid));
      if (userDoc.exists()) {
        return { uid: userDoc.id, ...userDoc.data() };
      }
    }
  } catch (err) {
    console.warn('Failed to fetch friend profile:', err);
  }
  return { uid: '', displayName: 'Peer Partner' };
};