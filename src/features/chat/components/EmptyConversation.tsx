"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

export default function EmptyConversation() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center shadow-sm">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
        <MessageCircle className="h-10 w-10 text-indigo-600" />
      </div>

      <h2 className="text-2xl font-bold text-slate-800">
        No conversations yet
      </h2>

      <p className="mt-3 max-w-md text-slate-500">
        Start chatting with one of your friends to begin a conversation.
      </p>

      <Link
        href="/friends"
        className="mt-8 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700"
      >
        Browse Friends
      </Link>
    </div>
  );
}