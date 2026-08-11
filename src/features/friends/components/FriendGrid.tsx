"use client";

import FriendCard from "./FriendCard";

import type { FriendProfile } from "../types";

interface Props {
  friends: FriendProfile[];
}

export default function FriendGrid({
  friends,
}: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {friends.map((friend) => (
        <FriendCard
          key={friend.uid}
          friend={friend}
        />
      ))}
    </div>
  );
}