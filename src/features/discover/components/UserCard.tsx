"use client";

import Image from "next/image";
import Link from "next/link";

import type { DiscoverUser } from "../types";
import { getMatchBadge } from "../utils/matchBadge";

interface Props {
  user: DiscoverUser;
  onConnect?: (uid: string) => void;
  isPending?: boolean;
  isFriend?: boolean;
  loading?: boolean;
  status?: "pending" | "friends";
}

export default function UserCard({
  user,
  onConnect,
  isPending = false,
  isFriend = false,
  loading = false,
  status,
}: Props) {
  const {
    profile,
    matchScore,
    reasons,
    breakdown,
  } = user;

  const effectiveIsPending = isPending || status === "pending";
  const effectiveIsFriend = isFriend || status === "friends";

  const badge = getMatchBadge(matchScore);

  const initials =
    profile.displayName?.charAt(0).toUpperCase() ||
    profile.username?.charAt(0).toUpperCase() ||
    "?";

  function renderButton() {
    if (effectiveIsFriend) {
      return (
        <button
          disabled
          className="flex-1 cursor-not-allowed rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white"
        >
          ✓ Friends
        </button>
      );
    }

    if (effectiveIsPending) {
      return (
        <button
          disabled
          className="flex-1 cursor-not-allowed rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white"
        >
          Pending
        </button>
      );
    }

    return (
      <button
        disabled={loading}
        onClick={() => onConnect?.(profile.uid)}
        className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Connecting..." : "Connect"}
      </button>
    );
  }

  function Progress({
    label,
    value,
    max,
    color,
  }: {
    label: string;
    value: number;
    max: number;
    color: string;
  }) {
    return (
      <div>
        <div className="mb-1 flex justify-between text-xs">
          <span>{label}</span>
          <span>
            {value}/{max}
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full ${color}`}
            style={{
              width: `${(value / max) * 100}%`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {profile.photoURL ? (
            <Image
              src={profile.photoURL}
              alt={profile.username}
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white">
              {initials}
            </div>
          )}

          <span
            className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${
              profile.online ? "bg-green-500" : "bg-gray-400"
            }`}
          />
        </div>

        <div className="flex-1">
          <h2 className="text-lg font-semibold">
            {profile.displayName || profile.username}
          </h2>

          <p className="text-sm text-slate-500">
            @{profile.username}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {profile.country} • {profile.language}
          </p>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="mt-5 line-clamp-2 text-sm leading-6 text-slate-600">
          {profile.bio}
        </p>
      )}

      {/* Interests */}
      {profile.interests.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {profile.interests.slice(0, 3).map((interest) => (
            <span
              key={interest}
              className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
            >
              {interest}
            </span>
          ))}

          {profile.interests.length > 3 && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              +{profile.interests.length - 3}
            </span>
          )}
        </div>
      )}

      {/* AI Compatibility */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">
              AI Compatibility
            </h3>

            <span
              className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge.bg} ${badge.color}`}
            >
              {badge.label}
            </span>
          </div>

          <span className={`text-2xl font-bold ${badge.color}`}>
            {matchScore}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full ${badge.progress}`}
            style={{ width: `${matchScore}%` }}
          />
        </div>
      </div>

      {/* Compatibility Breakdown */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">
          Compatibility Breakdown
        </h3>

        <div className="space-y-3">
          <Progress
            label="Interests"
            value={breakdown.interests}
            max={35}
            color="bg-indigo-600"
          />

          <Progress
            label="Goals"
            value={breakdown.goals}
            max={25}
            color="bg-green-500"
          />

          <Progress
            label="Language"
            value={breakdown.language}
            max={15}
            color="bg-purple-500"
          />

          <Progress
            label="Personality"
            value={breakdown.personality}
            max={15}
            color="bg-pink-500"
          />

          <Progress
            label="Country"
            value={breakdown.country}
            max={10}
            color="bg-amber-500"
          />
        </div>
      </div>

      {/* Why You Match */}
      {reasons.length > 0 && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Why you match
          </h3>

          <ul className="space-y-2 text-xs text-slate-600">
            {reasons.slice(0, 4).map((reason) => (
              <li
                key={reason}
                className="flex items-start gap-2"
              >
                <span className="mt-0.5 text-green-500">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <Link
          href={`/profile/${profile.uid}`}
          className="flex-1 rounded-xl border border-slate-300 py-2.5 text-center text-sm font-medium transition hover:border-indigo-500 hover:bg-indigo-50"
        >
          View Profile
        </Link>

        {renderButton()}
      </div>
    </div>
  );
}