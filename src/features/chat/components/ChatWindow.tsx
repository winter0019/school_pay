"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { canStartDirectChat } from "../services/conversationService";
import { calculateMatch } from "@/features/matching/services/aiMatching";

interface ChatWindowProps {
  currentUid: string;
  currentUserProfile?: any;
  partner: {
    uid: string;
    displayName: string;
    username?: string;
    photoURL?: string;
    online?: boolean;
    interests?: string[];
    goals?: string[];
    language?: string;
    country?: string;
    [key: string]: any;
  };
  messages?: any[];
  onSendMessage?: (text: string) => Promise<void>;
}

export default function ChatWindow({
  currentUid,
  currentUserProfile,
  partner,
  messages = [],
  onSendMessage,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  // Check if direct messaging is allowed (must be accepted friends)
  useEffect(() => {
    async function verifyConnection() {
      if (!currentUid || !partner?.uid) return;
      setChecking(true);
      const result = await canStartDirectChat(currentUid, partner.uid);
      setIsAllowed(result.allowed);
      setChecking(false);
    }

    verifyConnection();
  }, [currentUid, partner?.uid]);

  // Spread first, then set required/fallback properties to prevent overwrite compiler errors
  const matchResult =
    currentUserProfile && partner
      ? calculateMatch(
          {
            ...currentUserProfile,
            uid: currentUid,
            interests: currentUserProfile.interests || [],
            goals: currentUserProfile.goals || [],
          },
          {
            ...partner,
            interests: partner.interests || [],
            goals: partner.goals || [],
          }
        )
      : { score: 0, reasons: [] };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !onSendMessage || !isAllowed) return;

    const textToSend = inputText;
    setInputText("");
    await onSendMessage(textToSend);
  };

  const initials =
    partner?.displayName?.charAt(0).toUpperCase() ||
    partner?.username?.charAt(0).toUpperCase() ||
    "?";

  return (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            {partner.photoURL ? (
              <Image
                src={partner.photoURL}
                alt={partner.displayName || "User"}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-sm font-bold">
                {initials}
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950 ${
                partner.online ? "bg-emerald-500" : "bg-slate-500"
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">
                {partner.displayName || partner.username || "Peer Partner"}
              </h2>
              {/* Match Percentage Badge */}
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
                {matchResult.score}% Match
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {partner.online ? "Active Now" : "Offline"}
            </p>
          </div>
        </div>

        <Link
          href={`/profile/${partner.uid}`}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          View Profile
        </Link>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-indigo-400">
              💬
            </div>
            <p className="mt-3 text-sm text-slate-400">
              No messages yet with {partner.displayName || "this user"}. Say hello!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderUid === currentUid;
            return (
              <div
                key={msg.id || msg.createdAt}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMe
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-900 text-slate-200 border border-slate-800"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area / Friend Guard Banner */}
      <div className="border-t border-slate-800 bg-slate-900/50 p-4">
        {checking ? (
          <div className="text-center text-xs text-slate-500 py-2">
            Checking connection status...
          </div>
        ) : isAllowed === false ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-xs text-amber-300">
            🔒 You can join the same Circles or Rooms with {partner.displayName || "this user"}, but you must send a connection request and have it accepted before sending Direct Messages.
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${partner.displayName || "peer"}...`}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-40"
            >
              ➔
            </button>
          </form>
        )}
      </div>
    </div>
  );
}