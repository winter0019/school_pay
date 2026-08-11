"use client";

import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firestore";
import ConversationList from "./components/ConversationList";
import EmptyInbox from "./components/EmptyInbox";
import { ConversationPreview } from "./types";

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, "conversations"),
        where("participantIds", "array-contains", user.uid),
        orderBy("updatedAt", "desc")
      );

      const unsubSnap = onSnapshot(
        q,
        (snapshot) => {
          const list: ConversationPreview[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            const partnerUid = (data.participantIds || []).find((id: string) => id !== user.uid) || "";

            return {
              id: docSnap.id,
              conversationKey: docSnap.id,
              participantIds: data.participantIds || [],
              lastMessage: data.lastMessage || "",
              lastMessageType: data.lastMessageType || "text",
              lastSenderUid: data.lastSenderUid || "",
              lastMessageAt: data.lastMessageAt || null,
              unreadCount: data.unreadCount || {},
              typing: data.typing || {},
              updatedAt: data.updatedAt || null,
              createdAt: data.createdAt || null,
              friend: {
                uid: partnerUid,
                displayName: data.partnerName || "Peer Partner",
                photoURL: data.partnerPhotoURL || "",
              },
              ...data,
            } as ConversationPreview;
          });

          setConversations(list);
          setLoading(false);
        },
        (err) => {
          console.error("Error loading inbox conversations:", err);
          setLoading(false);
        }
      );

      return () => unsubSnap();
    });

    return () => unsubAuth();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-slate-400">
        Loading inbox...
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return <EmptyInbox />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Inbox
        </h1>
        <p className="text-slate-400">
          Your active peer messages.
        </p>
      </div>

      <ConversationList conversations={conversations} />
    </div>
  );
}