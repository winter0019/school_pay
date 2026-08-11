"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Message } from "../types";

import {
  markConversationRead,
  sendMessage,
  subscribeToMessages,
  updateTyping,
} from "../services/messageService";

interface Options {
  conversationId: string;
  currentUid: string;
  friendUid: string;
}

export default function useMessages({
  conversationId,
  currentUid,
  friendUid,
}: Options) {
  const [messages, setMessages] = useState<Message[]>([]);

  const [loading, setLoading] = useState(true);

  const [sending, setSending] = useState(false);

  const [typing, setTyping] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // -----------------------------
  // Realtime Listener
  // -----------------------------
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribeToMessages(
      conversationId,
      (items) => {
        setMessages(items);
        setLoading(false);
      },
      (err) => {
        console.error(err);

        setError("Unable to load messages.");

        setLoading(false);
      }
    );

    return unsubscribe;
  }, [conversationId]);

  // -----------------------------
  // Mark conversation as read
  // -----------------------------
  useEffect(() => {
    if (!conversationId || !currentUid) return;

    markConversationRead(
      conversationId,
      currentUid
    );
  }, [conversationId, currentUid]);

  // -----------------------------
  // Auto scroll
  // -----------------------------
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // -----------------------------
  // Send Message
  // -----------------------------
  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      try {
        setSending(true);

        await sendMessage({
          conversationId,
          senderUid: currentUid,
          receiverUid: friendUid,
          text,
        });

        await updateTyping(
          conversationId,
          currentUid,
          false
        );
      } catch (err) {
        console.error(err);

        setError("Unable to send message.");
      } finally {
        setSending(false);
      }
    },
    [
      conversationId,
      currentUid,
      friendUid,
    ]
  );

  // -----------------------------
  // Typing
  // -----------------------------
  const setTypingState = useCallback(
    async (value: boolean) => {
      setTyping(value);

      try {
        await updateTyping(
          conversationId,
          currentUid,
          value
        );
      } catch (err) {
        console.error(err);
      }
    },
    [conversationId, currentUid]
  );

  return {
    messages,

    loading,

    sending,

    typing,

    error,

    bottomRef,

    send,

    setTypingState,
  };
}