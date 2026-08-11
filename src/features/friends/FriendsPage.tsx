"use client";

import useFriends from "./hooks/useFriends";
import FriendGrid from "./components/FriendGrid";
import EmptyFriends from "./components/EmptyFriends";
import SearchFriends from "./components/SearchFriends";

export default function FriendsPage() {
  const {
    friends,
    search,
    setSearch,
  } = useFriends();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Friends
        </h1>

        <p className="text-slate-500">
          Your accepted connections.
        </p>
      </div>

      <SearchFriends
        value={search}
        onChange={setSearch}
      />

      {friends.length === 0 ? (
        <EmptyFriends />
      ) : (
        <FriendGrid friends={friends} />
      )}
    </div>
  );
}