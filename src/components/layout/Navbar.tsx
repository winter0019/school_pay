"use client";

import { Bell, MessageCircle, Search } from "lucide-react";
import { useUserStore } from "@/store/userStore";

export default function Navbar() {
  const user = useUserStore((state) => state.user);

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-8 backdrop-blur">
      <div className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-2">
        <Search size={18} />

        <input
          placeholder="Search people..."
          className="bg-transparent outline-none"
        />
      </div>

      <div className="flex items-center gap-6">
        <Bell className="cursor-pointer" />

        <MessageCircle className="cursor-pointer" />

        <div className="flex items-center gap-3">
          <img
            src={user?.photoURL || "https://placehold.co/50"}
            alt="avatar"
            className="h-10 w-10 rounded-full"
          />

          <div>
            <p className="font-semibold">
              {user?.username || user?.displayName || "User"}
            </p>

            <p className="text-xs text-slate-400">
              Online
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}