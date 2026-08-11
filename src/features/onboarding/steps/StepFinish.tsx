"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { auth } from "@/firebase/config";
import { completeOnboarding } from "@/firebase/userService";
import { useOnboardingStore } from "@/store/onboardingStore";

export default function StepFinish() {
  const router = useRouter();

  const { data, previousStep, reset } = useOnboardingStore();

  const [saving, setSaving] = useState(false);

  async function finish() {
    try {
      setSaving(true);

      const user = auth.currentUser;

      if (!user) {
        alert("Please sign in again.");
        return;
      }

      await completeOnboarding(user.uid, data);

      reset();

      router.replace("/dashboard");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);

      alert(
        "Something went wrong while saving your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-bold">
        🎉 Review Your Profile
      </h1>

      <p className="mt-2 text-slate-500">
        Please review your information before finishing.
      </p>

      <div className="mt-8 space-y-6">
        <section className="rounded-xl border p-5">
          <h2 className="text-lg font-bold">👤 Profile</h2>

          <p className="mt-3">
            <strong>Name:</strong> {data.username}
          </p>

          <p>
            <strong>Bio:</strong> {data.bio || "Not provided"}
          </p>
        </section>

        <section className="rounded-xl border p-5">
          <h2 className="text-lg font-bold">🌍 Location</h2>

          <p>
            <strong>Country:</strong> {data.country}
          </p>

          <p>
            <strong>Language:</strong> {data.language}
          </p>
        </section>

        <section className="rounded-xl border p-5">
          <h2 className="text-lg font-bold">❤️ Interests</h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {data.interests.map((item) => (
              <span
                key={item}
                className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border p-5">
          <h2 className="text-lg font-bold">🎯 Goals</h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {data.goals.map((item) => (
              <span
                key={item}
                className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700"
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-xl border p-5">
          <h2 className="text-lg font-bold">🧠 Personality</h2>

          <p className="capitalize">
            <strong>Type:</strong> {data.personality}
          </p>

          <p className="mt-3 whitespace-pre-wrap">
            <strong>About Me:</strong>{" "}
            {data.personalityDescription || "Not provided"}
          </p>
        </section>
      </div>

      <div className="mt-10 flex justify-between">
        <button
          onClick={previousStep}
          disabled={saving}
          className="rounded-xl border border-slate-300 px-6 py-3 disabled:opacity-50"
        >
          ← Back
        </button>

        <button
          onClick={finish}
          disabled={saving}
          className="rounded-xl bg-green-600 px-6 py-3 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Finish Setup ✓"}
        </button>
      </div>
    </>
  );
}