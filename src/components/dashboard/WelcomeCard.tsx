"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { useUserStore } from "@/store/userStore";

export default function WelcomeCard() {
  const user = useUserStore((state) => state.user);

  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      setGreeting("Good Morning");
    } else if (hour < 18) {
      setGreeting("Good Afternoon");
    } else {
      setGreeting("Good Evening");
    }
  }, []);

  return (
    <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
      <div className="flex items-center gap-3">
        <Sparkles className="h-7 w-7" />

        <h1 className="text-3xl font-bold">
          {greeting},{" "}
          {user?.username || user?.displayName || "Friend"} 👋
        </h1>
      </div>

      <p className="mt-4 max-w-2xl text-blue-100">
        Welcome back to ConversationOS. Your AI companion is ready to
        help you discover meaningful conversations around the world.
      </p>
    </div>
  );
}