"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import {
  acceptFriendRequest,
  declineFriendRequest,
} from "../services/friendRequestService";

interface Props {
  requestId: string;

  sender: {
    uid: string;
    displayName: string;
    username: string;
    photoURL?: string;
  };

  onAction?: () => void;
}

export default function FriendRequestCard({
  requestId,
  sender,
  onAction,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    try {
      setLoading(true);

      await acceptFriendRequest(requestId);

      toast.success("Friend request accepted.");

      onAction?.();
    } catch (err) {
      toast.error("Unable to accept request.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline() {
    try {
      setLoading(true);

      await declineFriendRequest(requestId);

      toast.success("Friend request declined.");

      onAction?.();
    } catch {
      toast.error("Unable to decline request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        {sender.photoURL ? (
          <Image
            src={sender.photoURL}
            alt={sender.displayName}
            width={56}
            height={56}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
            {sender.displayName.charAt(0)}
          </div>
        )}

        <div className="flex-1">
          <h3 className="font-semibold">
            {sender.displayName}
          </h3>

          <p className="text-sm text-slate-500">
            @{sender.username}
          </p>

          <p className="mt-2 text-sm">
            sent you a friend request.
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          disabled={loading}
          onClick={handleDecline}
          className="flex-1 rounded-xl border py-2"
        >
          Decline
        </button>

        <button
          disabled={loading}
          onClick={handleAccept}
          className="flex-1 rounded-xl bg-indigo-600 py-2 text-white"
        >
          {loading ? "Please wait..." : "Accept"}
        </button>
      </div>
    </div>
  );
}