"use client";

import Image from "next/image";

import {
  MoreVertical,
  Phone,
  Search,
  Video,
} from "lucide-react";

interface Props {
  friend: {
    uid: string;
    displayName: string;
    username: string;
    photoURL: string;
    online: boolean;
  };

  typing?: boolean;
}

export default function ChatHeader({
  friend,
  typing = false,
}: Props) {
  const initials =
    friend.displayName?.charAt(0).toUpperCase() ||
    friend.username?.charAt(0).toUpperCase() ||
    "?";

  return (
    <header className="sticky top-0 z-20 border-b bg-white">
      <div className="flex items-center justify-between px-5 py-3">

        {/* Left */}

        <div className="flex items-center gap-4">

          <div className="relative">

            {friend.photoURL ? (
              <Image
                src={friend.photoURL}
                alt={friend.displayName}
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
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

          <div>

            <h2 className="font-semibold">
              {friend.displayName}
            </h2>

            {typing ? (
              <p className="text-sm text-green-600">
                typing...
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                {friend.online
                  ? "Online"
                  : "Offline"}
              </p>
            )}

          </div>

        </div>

        {/* Right */}

        <div className="flex items-center gap-2">

          <button
            className="rounded-full p-2 transition hover:bg-slate-100"
            title="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            className="rounded-full p-2 transition hover:bg-slate-100"
            title="Voice Call"
          >
            <Phone className="h-5 w-5" />
          </button>

          <button
            className="rounded-full p-2 transition hover:bg-slate-100"
            title="Video Call"
          >
            <Video className="h-5 w-5" />
          </button>

          <button
            className="rounded-full p-2 transition hover:bg-slate-100"
            title="More"
          >
            <MoreVertical className="h-5 w-5" />
          </button>

        </div>

      </div>
    </header>
  );
}