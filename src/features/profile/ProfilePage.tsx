"use client";

import Image from "next/image";
import { useParams } from "next/navigation";

import useProfile from "./hooks/useProfile";

export default function ProfilePage() {
  const params = useParams();

  const uid = params.uid as string;

  const {
    profile,
    loading,
  } = useProfile(uid);

  if (loading) {
    return (
      <div className="p-8">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8">
        User not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">

      <div className="rounded-2xl bg-white p-8 shadow">

        <div className="flex items-center gap-6">

          {profile.photoURL ? (
            <Image
              src={profile.photoURL}
              alt={profile.displayName}
              width={110}
              height={110}
              className="rounded-full"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-indigo-600 text-3xl font-bold text-white">
              {(profile.displayName || "?")[0]}
            </div>
          )}

          <div>

            <h1 className="text-3xl font-bold">
              {profile.displayName}
            </h1>

            <p className="text-slate-500">
              @{profile.username}
            </p>

            <p className="mt-2">
              🌍 {profile.country}
            </p>

            <p className="mt-2">
              {profile.bio}
            </p>

          </div>

        </div>

      </div>

      {profile.interests?.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow">

          <h2 className="mb-4 text-xl font-semibold">
            Interests
          </h2>

          <div className="flex flex-wrap gap-2">
            {profile.interests.map((item: string) => (
              <span
                key={item}
                className="rounded-full bg-indigo-100 px-4 py-2 text-sm text-indigo-700"
              >
                {item}
              </span>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}