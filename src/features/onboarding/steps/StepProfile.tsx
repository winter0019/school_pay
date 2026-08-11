"use client";

import { useState } from "react";

import { useOnboardingStore } from "@/store/onboardingStore";

export default function StepProfile() {
  const data = useOnboardingStore((s) => s.data);
  const updateField = useOnboardingStore((s) => s.updateField);
  const nextStep = useOnboardingStore((s) => s.nextStep);

  const [username, setUsername] = useState(data.username);
  const [bio, setBio] = useState(data.bio);

  function continueNext() {
    if (!username.trim()) {
      alert("Please enter your name.");
      return;
    }

    updateField("username", username);
    updateField("bio", bio);

    nextStep();
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-slate-900">
        Your Profile
      </h1>

      <p className="mt-2 text-slate-500">
        Tell us a little about yourself.
      </p>

      <div className="mt-8 space-y-5">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl border border-slate-300 px-4 py-3"
        />

        <textarea
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell everyone about yourself..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3"
        />

        <button
          onClick={continueNext}
          className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Continue →
        </button>
      </div>
    </>
  );
}