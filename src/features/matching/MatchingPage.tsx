"use client";

import Link from "next/link";

import useDiscover from "@/features/discover/hooks/useDiscover";
import UserGrid from "@/features/discover/components/UserGrid";
import LoadingSkeleton from "@/features/discover/components/LoadingSkeleton";
import EmptyState from "@/features/discover/components/EmptyState";

export default function MatchingPage() {
  const { users, loading } = useDiscover();

  const topMatches = [...users]
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white">
        <h1 className="text-4xl font-bold">
          🤖 AI Match
        </h1>

        <p className="mt-3 max-w-2xl text-indigo-100">
          These are the people our AI believes you'll connect with best,
          based on your interests, goals, personality, location and profile.
        </p>
      </div>

      {loading && <LoadingSkeleton />}

      {!loading && topMatches.length === 0 && (
        <EmptyState />
      )}

      {!loading && topMatches.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Top Matches
            </h2>

            <Link
              href="/discover"
              className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Browse Everyone
            </Link>
          </div>

          <UserGrid users={topMatches} />
        </>
      )}
    </div>
  );
}