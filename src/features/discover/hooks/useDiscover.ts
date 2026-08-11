"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getDiscoverUsers } from "../services/discoverService";

import type { DiscoverUser } from "../types";
import { useUserStore } from "@/store/userStore";

export default function useDiscover() {
  const currentUser = useUserStore((state) => state.user);

  const [users, setUsers] = useState<DiscoverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const results = await getDiscoverUsers(currentUser);

      setUsers(results);
    } catch (err) {
      console.error(err);

      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;

    const keyword = search.toLowerCase();

    return users.filter(({ profile }) => {
      return (
        profile.username.toLowerCase().includes(keyword) ||
        profile.displayName.toLowerCase().includes(keyword) ||
        profile.country.toLowerCase().includes(keyword) ||
        profile.language.toLowerCase().includes(keyword) ||
        profile.interests.some((i) =>
          i.toLowerCase().includes(keyword)
        )
      );
    });
  }, [users, search]);

  return {
    users: filteredUsers,

    loading,

    error,

    search,

    setSearch,

    refresh,
  };
}