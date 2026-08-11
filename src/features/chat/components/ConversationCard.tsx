"use client";

import Image from "next/image";
import Link from "next/link";

import type { ConversationPreview } from "../types";

interface Props {
  conversation: ConversationPreview;
}

export default function ConversationCard({
  conversation,
}: Props) {
  const { friend } = conversation;

  const initials =
    friend.displayName?.charAt(0).toUpperCase() ||
    friend.username?.charAt(0).toUpperCase() ||
    "?";

  const unread =
    conversation.unreadCount?.[friend.uid] ?? 0;

  const isTyping =
    conversation.typing?.[friend.uid] ?? false;

  const time =
    conversation.lastMessageAt
      ?.toDate?.()
      ?.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }) ?? "";

  function getPreview() {
    if (isTyping) return "Typing...";

    switch (conversation.lastMessageType) {
      case "image":
        return "🖼 Photo";

      case "voice":
        return "🎤 Voice message";

      case "audio":
        return "🎵 Audio";

      case "video":
        return "🎥 Video";

      case "file":
        return "📄 Document";

      case "location":
        return "📍 Location";

      case "ai":
        return "🤖 AI Message";

      default:
        return (
          conversation.lastMessage ||
          "Start chatting..."
        );
    }
  }

  return (
    <Link
      href={`/chat/${conversation.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:border-indigo-300 hover:shadow-lg"
    >
      <div className="flex items-center gap-4">

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {friend.photoURL ? (
            <Image
              src={friend.photoURL}
              alt={friend.displayName}
              width={56}
              height={56}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white">
              {initials}
            </div>
          )}

          <span
            className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${
              friend.online
                ? "bg-green-500"
                : "bg-gray-400"
            }`}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-2">

              <h2 className="truncate font-semibold text-slate-800">
                {friend.displayName}
              </h2>

              {conversation.pinnedBy?.length > 0 && (
                <span title="Pinned">
                  📌
                </span>
              )}

              {conversation.mutedBy?.length > 0 && (
                <span title="Muted">
                  🔕
                </span>
              )}
            </div>

            <span className="text-xs text-slate-400">
              {time}
            </span>

          </div>

          <div className="mt-1 flex items-center justify-between gap-3">

            <p
              className={`truncate text-sm ${
                unread
                  ? "font-semibold text-slate-800"
                  : "text-slate-500"
              }`}
            >
              {getPreview()}
            </p>

            {unread > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-600 px-2 text-xs font-bold text-white">
                {unread}
              </span>
            )}

          </div>

        </div>

      </div>
    </Link>
  );
}