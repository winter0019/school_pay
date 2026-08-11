"use client";

import { useEffect, useState } from "react";

import {
  getFriendProfile,
} from "../services/conversationService";

export function useConversation(
  conversationId: string,
  currentUid: string
) {
  const [friend, setFriend] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (!conversationId || !currentUid) return;

    async function load() {
      try {
        const profile =
          await getFriendProfile(
            conversationId,
            currentUid
          );

        setFriend(profile);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [conversationId, currentUid]);

  return {
    friend,
    loading,
  };
}