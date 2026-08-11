"use client";

import { MessageCircle } from "lucide-react";

const conversations = [
  {
    id: 1,
    name: "AI Mentor",
    lastMessage: "Ready to explore new ideas today?",
    time: "2 min ago",
    unread: 2,
  },
  {
    id: 2,
    name: "Startup Community",
    lastMessage: "Someone shared a new business opportunity.",
    time: "15 min ago",
    unread: 0,
  },
  {
    id: 3,
    name: "John Doe",
    lastMessage: "Thanks! Let's continue tomorrow.",
    time: "Yesterday",
    unread: 1,
  },
];

export default function RecentConversations() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <MessageCircle className="h-5 w-5 text-blue-400" />
          Recent Conversations
        </h2>

        <button className="text-sm text-blue-400 hover:text-blue-300">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {conversations.map((chat) => (
          <div
            key={chat.id}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 transition hover:border-blue-500"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 font-bold">
                {chat.name.charAt(0)}
              </div>

              <div>
                <h3 className="font-semibold">{chat.name}</h3>

                <p className="text-sm text-slate-400">
                  {chat.lastMessage}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-500">
                {chat.time}
              </p>

              {chat.unread > 0 && (
                <span className="mt-2 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-bold text-white">
                  {chat.unread}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}