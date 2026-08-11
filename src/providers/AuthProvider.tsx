"use client";

import { useEffect } from "react";

import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/firebase/config";
import { getUserProfile } from "@/firebase/userService";

import { useUserStore } from "@/store/userStore";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setUser = useUserStore((s) => s.setUser);
  const clearUser = useUserStore((s) => s.clearUser);

  const setLoading = useUserStore((s) => s.setLoading);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      try {
        if (!firebaseUser) {
          clearUser();
          return;
        }

        const profile = await getUserProfile(firebaseUser.uid);

        if (profile) {
          setUser(profile);
        } else {
          clearUser();
        }
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [setUser, clearUser, setLoading]);

  return children;
}