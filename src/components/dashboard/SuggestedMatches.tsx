"use client";

import { MapPin, Sparkles } from "lucide-react";

const matches = [
  {
    id: 1,
    name: "Amina Yusuf",
    country: "Nigeria",
    match: 96,
    interests: ["Programming", "Business"],
  },
  {
    id: 2,
    name: "David Kim",
    country: "South Korea",
    match: 92,
    interests: ["AI", "Startups"],
  },
  {
    id: 3,
    name: "Sarah Johnson",
    country: "United Kingdom",
    match: 89,
    interests: ["Marketing", "Technology"],
  },
];

export default function SuggestedMatches() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="h-5 w-5 text-blue-400" />
          Suggested Matches
        </h2>

        <button className="text-sm text-blue-400 hover:text-blue-300">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {matches.map((person) => (
          <div
            key={person.id}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 hover:border-blue-500 transition"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold">
                {person.name.charAt(0)}
              </div>

              <div>
                <h3 className="font-semibold">{person.name}</h3>

                <div className="mt-1 flex items-center gap-1 text-sm text-slate-400">
                  <MapPin className="h-4 w-4" />
                  {person.country}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {person.interests.map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full bg-slate-800 px-2 py-1 text-xs"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-green-400">
                {person.match}%
              </p>

              <p className="text-xs text-slate-400">
                Match
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}