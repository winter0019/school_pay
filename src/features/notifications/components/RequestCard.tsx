"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  acceptFriendRequest,
  declineFriendRequest,
} from "../services/friendRequestService";

interface Props {
  request: any;
}

export default function RequestCard({ request }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    try {
      setLoading(true);

      await acceptFriendRequest(request.id);

      toast.success("Friend request accepted.");
    } catch (error) {
      console.error(error);

      toast.error("Unable to accept request.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline() {
    try {
      setLoading(true);

      await declineFriendRequest(request.id);

      toast.success("Friend request declined.");
    } catch (error) {
      console.error(error);

      toast.error("Unable to decline request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">

        <div>
          <h3 className="font-semibold">
            {request.senderDisplayName || request.senderUid}
          </h3>

          <p className="text-sm text-slate-500">
            sent you a friend request.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDecline}
            disabled={loading}
            className="rounded-lg border px-4 py-2 disabled:opacity-50"
          >
            Decline
          </button>

          <button
            onClick={handleAccept}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Please wait..." : "Accept"}
          </button>
        </div>

      </div>
    </div>
  );
}