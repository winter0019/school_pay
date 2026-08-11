"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getAuth } from "firebase/auth";

import type { FriendProfile } from "../types";

import { getOrCreateConversation } from "@/features/chat/services/chatService";

interface Props {
  friend: FriendProfile;
}

export default function FriendCard({
  friend,
}: Props) {
  const router = useRouter();

  const [opening, setOpening] = useState(false);

  async function handleMessage() {
    const auth = getAuth();
    const authUser = auth.currentUser;

    if (!authUser) {
      console.error("No authenticated Firebase user.");
      return;
    }

    try {
      setOpening(true);

      const conversationId =
        await getOrCreateConversation(
          authUser.uid,
          friend.uid
        );

      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error(
        "Unable to open conversation:",
        error
      );
    } finally {
      setOpening(false);
    }
  }

  const initials =
    friend.displayName?.charAt(0).toUpperCase() ||
    friend.username?.charAt(0).toUpperCase() ||
    "?";

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-lg">
      <div className="flex items-center gap-4">
        {friend.photoURL ? (
          <Image
            src={friend.photoURL}
            alt={friend.displayName}
            width={60}
            height={60}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
            {initials}
          </div>
        )}

        <div className="flex-1">
          <h2 className="font-semibold">
            {friend.displayName}
          </h2>

          <p className="text-sm text-slate-500">
            @{friend.username}
          </p>

          <p className="text-xs text-slate-400">
            {friend.country}
          </p>
        </div>

        <span
          className={`h-3 w-3 rounded-full ${
            friend.online
              ? "bg-green-500"
              : "bg-gray-400"
          }`}
        />
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={handleMessage}
          disabled={opening}
          className="flex-1 rounded-xl bg-indigo-600 py-2 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {opening ? "Opening..." : "Message"}
        </button>

        <Link
          href={`/profile/${friend.uid}`}
          className="flex-1 rounded-xl border py-2 text-center transition hover:bg-slate-50"
        >
          Profile
        </Link>
      </div>
    </div>
  );
}