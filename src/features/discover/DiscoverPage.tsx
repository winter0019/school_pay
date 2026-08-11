"use client";

import { useState } from "react";
import { toast } from "sonner";

import SearchBar from "./components/SearchBar";
import FilterPanel from "./components/FilterPanel";
import UserGrid from "./components/UserGrid";
import LoadingSkeleton from "./components/LoadingSkeleton";
import EmptyState from "./components/EmptyState";

import useDiscover from "./hooks/useDiscover";

import { useUserStore } from "@/store/userStore";
import { sendFriendRequest } from "@/features/friends/services/friendRequestService";

export default function DiscoverPage() {
  const currentUser = useUserStore((s) => s.user);

  const {
    users,
    loading,
    search,
    setSearch,
  } = useDiscover();

  // uid -> pending/friends
  const [requestStatus, setRequestStatus] = useState<
    Record<string, "pending" | "friends">
  >({});

  const [connectingUid, setConnectingUid] =
    useState<string | null>(null);

  async function handleConnect(receiverUid: string) {
    if (!currentUser) {
      toast.error("Please sign in first.");
      return;
    }

    try {
      setConnectingUid(receiverUid);

      const result = await sendFriendRequest(
        currentUser.uid,
        receiverUid
      );

      switch (result) {
        case "sent":
          setRequestStatus((prev) => ({
            ...prev,
            [receiverUid]: "pending",
          }));

          toast.success("Friend request sent.");
          break;

        case "pending":
          setRequestStatus((prev) => ({
            ...prev,
            [receiverUid]: "pending",
          }));

          toast.warning("Friend request already pending.");
          break;

        case "friends":
          setRequestStatus((prev) => ({
            ...prev,
            [receiverUid]: "friends",
          }));

          toast.info("You're already friends.");
          break;

        default:
          toast.error("Something went wrong.");
      }
    } catch (error) {
      console.error(error);

      toast.error("Unable to send request.");
    } finally {
      setConnectingUid(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Discover People
        </h1>

        <p className="mt-2 text-slate-500">
          Find people who share your interests,
          personality and goals.
        </p>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
      />

      <FilterPanel />

      {loading && <LoadingSkeleton />}

      {!loading && users.length === 0 && (
        <EmptyState />
      )}

      {!loading && users.length > 0 && (
        <UserGrid
          users={users}
          onConnect={handleConnect}
          connectingUid={connectingUid}
          requestStatus={requestStatus}
        />
      )}
    </div>
  );
}