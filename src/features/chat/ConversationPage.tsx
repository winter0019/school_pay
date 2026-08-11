"use client";

import { useParams } from "next/navigation";

export default function ConversationPage() {
  const { conversationId } = useParams();

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">
        Conversation
      </h1>

      <div className="rounded-xl border bg-white p-6">
        Conversation ID:

        <div className="mt-3 rounded bg-slate-100 p-2 text-sm">
          {conversationId}
        </div>
      </div>

    </div>
  );
}