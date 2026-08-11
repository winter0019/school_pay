"use client";

import { Fragment } from "react";

import type { Message } from "../types";

import MessageBubble from "./MessageBubble";

interface Props {
  messages: Message[];
  currentUid: string;
  loading: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}

function formatDay(date: Date) {
  const today = new Date();

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const d = new Date(date);

  if (d.toDateString() === today.toDateString()) {
    return "Today";
  }

  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return d.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MessageList({
  messages,
  currentUid,
  loading,
  bottomRef,
}: Props) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading messages...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
        <div className="text-6xl">💬</div>

        <h2 className="mt-4 text-xl font-semibold">
          No messages yet
        </h2>

        <p className="mt-2 text-sm">
          Start the conversation by sending the first message.
        </p>
      </div>
    );
  }

  let previousDay = "";

  return (
    <div className="space-y-4 px-4 py-6">
      {messages.map((message) => {
        const date =
          message.createdAt?.toDate?.() ?? new Date();

        const currentDay = formatDay(date);

        const showHeader = currentDay !== previousDay;

        previousDay = currentDay;

        return (
          <Fragment key={message.id}>
            {showHeader && (
              <div className="flex justify-center">
                <div className="rounded-full bg-slate-200 px-4 py-1 text-xs font-medium text-slate-600">
                  {currentDay}
                </div>
              </div>
            )}

            <MessageBubble
              message={message}
              currentUid={currentUid}
            />
          </Fragment>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}