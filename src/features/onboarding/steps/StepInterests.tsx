"use client";

import { useOnboardingStore } from "@/store/onboardingStore";
import { INTEREST_OPTIONS } from "../constants";

export default function StepInterests() {
  const data = useOnboardingStore((s) => s.data);
  const updateField = useOnboardingStore((s) => s.updateField);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const previousStep = useOnboardingStore((s) => s.previousStep);

  const interests = data.interests;

  function toggleInterest(value: string) {
    if (interests.includes(value)) {
      updateField(
        "interests",
        interests.filter((item) => item !== value)
      );
    } else {
      updateField("interests", [...interests, value]);
    }
  }

  function continueNext() {
    if (interests.length === 0) {
      alert("Please select at least one interest.");
      return;
    }

    nextStep();
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-slate-900">
        Interests
      </h1>

      <p className="mt-2 text-slate-500">
        Tell us what you're interested in.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {INTEREST_OPTIONS.map((interest) => {
          const selected = interests.includes(interest);

          return (
            <button
              key={interest}
              type="button"
              onClick={() => toggleInterest(interest)}
              className={`rounded-full border px-4 py-2 transition ${
                selected
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {interest}
            </button>
          );
        })}
      </div>

      <div className="mt-10 flex justify-between">
        <button
          onClick={previousStep}
          className="rounded-xl border border-slate-300 px-6 py-3 hover:bg-slate-100"
        >
          ← Back
        </button>

        <button
          onClick={continueNext}
          className="rounded-xl bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Continue →
        </button>
      </div>
    </>
  );
}