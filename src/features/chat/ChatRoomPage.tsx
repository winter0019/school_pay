"use client";

interface Props {
  conversationId: string;
}

export default function ChatRoomPage({
  conversationId,
}: Props) {
  return (
    <div className="space-y-6">

      <div className="rounded-xl border bg-white p-5">

        <h1 className="text-2xl font-bold">
          Conversation
        </h1>

        <p className="text-slate-500">
          {conversationId}
        </p>

      </div>

    </div>
  );
}