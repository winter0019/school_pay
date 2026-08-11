"use client";

import Image from "next/image";
import { FileText, Play, Pause, Film, Music, Mic, MapPin, Bot } from "lucide-react";
import { useState, useRef } from "react";
import type { Message } from "../types";

interface Props {
  message: Message & {
    mediaType?: string;
    mediaUrl?: string;
    fileName?: string;
    fileSize?: number;
  };
  currentUid: string;
}

export default function MessageBubble({ message, currentUid }: Props) {
  const mine = message.senderUid === currentUid;
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Safe time calculation across Firestore Timestamp and JS Date formats
  const time = (() => {
    if (!message.createdAt) return "";
    let date: Date | null = null;
    if (typeof (message.createdAt as any)?.toDate === "function") {
      date = (message.createdAt as any).toDate();
    } else if (typeof message.createdAt?.seconds === "number") {
      date = new Date(message.createdAt.seconds * 1000);
    } else if (message.createdAt instanceof Date) {
      date = message.createdAt;
    }
    return date ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  })();

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Helper to scale single emoji messages
  const isOnlyEmoji = (str?: string) => {
    if (!str) return false;
    const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])+$/;
    return emojiRegex.test(str.trim());
  };

  // Resolve type or mediaType with string type assertion for custom message types
  const resolvedType = (message.type || message.mediaType || "text") as string;

  function renderContent() {
    if (message.deleted) {
      return (
        <p className="italic text-slate-400 text-xs">
          This message was deleted
        </p>
      );
    }

    switch (resolvedType) {
      case "image":
        return (
          <div className="space-y-2">
            {message.mediaUrl && (
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={message.mediaUrl}
                  alt="Attached image"
                  className="max-h-64 w-full object-cover rounded-xl"
                />
              </div>
            )}
            {message.text && (
              <p className={isOnlyEmoji(message.text) ? "text-3xl leading-tight" : "text-sm"}>
                {message.text}
              </p>
            )}
          </div>
        );

      case "voice":
      case "audio":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-3 py-1 min-w-[200px]">
              <button
                type="button"
                onClick={toggleAudio}
                className={`p-2.5 rounded-full flex-shrink-0 transition ${
                  mine
                    ? "bg-indigo-700 hover:bg-indigo-800 text-white"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <div className="flex-1 flex items-center gap-1 h-5">
                {[0.4, 0.8, 0.3, 0.9, 0.5, 0.7, 0.3, 0.6, 0.4, 0.7].map((heightScale, idx) => (
                  <span
                    key={idx}
                    style={{ height: `${heightScale * 18}px` }}
                    className={`w-1 rounded-full ${
                      mine ? "bg-indigo-200" : "bg-slate-400"
                    }`}
                  />
                ))}
              </div>

              {message.mediaUrl && (
                <audio
                  ref={audioRef}
                  src={message.mediaUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              )}
            </div>
            {message.text && <p className="text-sm">{message.text}</p>}
          </div>
        );

      case "video":
        return (
          <div className="space-y-2">
            {message.mediaUrl ? (
              <video
                src={message.mediaUrl}
                controls
                className="max-h-64 w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <Film className="w-4 h-4 text-indigo-400" />
                <span>Video Attachment</span>
              </div>
            )}
            {message.text && <p className="text-sm">{message.text}</p>}
          </div>
        );

      case "file":
      case "document":
        return (
          <div className="space-y-2">
            <a
              href={message.mediaUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                mine
                  ? "bg-indigo-700/60 border-indigo-500/50 hover:bg-indigo-700"
                  : "bg-slate-100 border-slate-200 hover:bg-slate-200"
              }`}
            >
              <FileText className={`w-7 h-7 ${mine ? "text-indigo-200" : "text-indigo-600"}`} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-xs truncate">
                  {message.fileName || "Document"}
                </p>
                {message.fileSize && (
                  <p className="text-[10px] opacity-70">
                    {(message.fileSize / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
            </a>
            {message.text && <p className="text-sm">{message.text}</p>}
          </div>
        );

      case "location":
        return (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-rose-500" />
            <span>Shared Location</span>
          </div>
        );

      case "ai":
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
              <Bot className="w-4 h-4" />
              <span>AI Assistant</span>
            </div>
            {message.text && <p className="text-sm">{message.text}</p>}
          </div>
        );

      default:
        if (!message.text && !message.mediaUrl) return null;
        return (
          <p className={isOnlyEmoji(message.text) ? "text-3xl leading-snug" : "text-sm leading-relaxed"}>
            {message.text}
          </p>
        );
    }
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} my-1`}>
      <div
        className={`max-w-[75%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm ${
          mine
            ? "bg-indigo-600 text-white rounded-br-none"
            : "bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-none"
        }`}
      >
        {message.replyTo && (
          <div
            className={`mb-2 rounded-lg border-l-4 p-2 text-xs ${
              mine
                ? "border-indigo-300 bg-indigo-700/50 text-indigo-100"
                : "border-indigo-500 bg-slate-900/50 text-slate-300"
            }`}
          >
            Replying to a message
          </div>
        )}

        {renderContent()}

        {/* TIMESTAMP & READ RECEIPTS */}
        <div
          className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
            mine ? "text-indigo-200" : "text-slate-400"
          }`}
        >
          {message.edited && <span>Edited</span>}
          {time && <span>{time}</span>}

          {mine && (
            <span>
              {(message.seenBy?.length ?? 0) > 1 ? "✓✓" : "✓"}
            </span>
          )}
        </div>

        {/* REACTIONS DISPLAY */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1 justify-end">
            {Object.entries(message.reactions).map(([uid, emoji]) => (
              <span
                key={uid}
                className="rounded-full bg-slate-900/40 border border-slate-700/50 px-2 py-0.5 text-xs"
              >
                {emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}