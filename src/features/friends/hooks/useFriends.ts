"use client";

import { useEffect, useMemo, useState } from "react";

import { subscribeToFriends } from "../services/friendService";
import type { FriendProfile } from "../types";

import { useUserStore } from "@/store/userStore";

export default function useFriends() {
  const user = useUserStore((s) => s.user);

  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToFriends(
      user.uid,
      setFriends
    );

    return unsubscribe;
  }, [user]);

  const filteredFriends = useMemo(() => {
    const q = search.toLowerCase();

    return friends.filter((friend) => {
      return (
        friend.displayName?.toLowerCase().includes(q) ||
        friend.username?.toLowerCase().includes(q)
      );
    });
  }, [friends, search]);

  return {
    friends: filteredFriends,
    search,
    setSearch,
  };
}