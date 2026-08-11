import { create } from "zustand";
import type { UserProfile } from "@/types/user";

interface UserStore {
  user: UserProfile | null;
  loading: boolean;

  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,

  loading: true,

  setUser: (user) =>
    set({
      user,
      loading: false,
    }),

  setLoading: (loading) =>
    set({
      loading,
    }),

  clearUser: () =>
    set({
      user: null,
      loading: false,
    }),
}));