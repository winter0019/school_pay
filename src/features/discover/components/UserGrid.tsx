"use client";

import UserCard from "./UserCard";
import type { DiscoverUser } from "../types";

interface Props {
  users: DiscoverUser[];
  connectingUid?: string | null;
  onConnect?: (uid: string) => void;
  requestStatus?: Record<string, "pending" | "friends">;
}

export default function UserGrid({
  users,
  connectingUid,
  onConnect,
  requestStatus = {},
}: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {users.map((user) => (
        <UserCard
          key={user.profile.uid}
          user={user}
          onConnect={onConnect}
          loading={connectingUid === user.profile.uid}
          status={requestStatus[user.profile.uid]}
        />
      ))}
    </div>
  );
}