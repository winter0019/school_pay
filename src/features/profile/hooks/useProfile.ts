"use client";

import { useEffect, useState } from "react";

import { getUserProfile } from "../services/profileService";

export default function useProfile(uid: string) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    async function load() {
      setLoading(true);

      const data = await getUserProfile(uid);

      setProfile(data);

      setLoading(false);
    }

    load();
  }, [uid]);

  return {
    profile,
    loading,
  };
}