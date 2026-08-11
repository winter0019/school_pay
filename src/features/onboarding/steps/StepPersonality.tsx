"use client";

import { useState } from "react";
import { PERSONALITY_OPTIONS } from "../constants";
import { useOnboardingStore } from "@/store/onboardingStore";

export default function StepPersonality() {
  const data = useOnboardingStore((s) => s.data);
  const updateField = useOnboardingStore((s) => s.updateField);

  const nextStep = useOnboardingStore((s) => s.nextStep);
  const previousStep = useOnboardingStore((s) => s.previousStep);

  const [description, setDescription] = useState(
    data.personalityDescription
  );

  function continueNext() {
    if (!data.personality) {
      alert("Please select your personality.");
      return;
    }

    updateField("personalityDescription", description);

    nextStep();
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-slate-900">
        Your Personality
      </h1>

      <p className="mt-2 text-slate-500">
        Choose the option that best describes you.
      </p>

      <div className="mt-8 space-y-4">
        {PERSONALITY_OPTIONS.map((item) => {
          const selected = data.personality === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => updateField("personality", item.id)}
              className={`w-full rounded-2xl border p-5 text-left transition ${
                selected
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-300 hover:border-blue-300"
              }`}
            >
              <h3 className="text-xl font-semibold">
                {item.title}
              </h3>

              <p className="mt-2 text-slate-600">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <label className="mb-2 block font-medium text-slate-700">
          Tell us more about yourself (optional)
        </label>

        <textarea
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Example: I enjoy discussing AI, meeting entrepreneurs, and having thoughtful conversations."
          className="w-full rounded-xl border border-slate-300 p-4"
        />
      </div>

      <div className="mt-10 flex justify-between">
        <button
          onClick={previousStep}
          className="rounded-xl border border-slate-300 px-6 py-3"
        >
          ← Back
        </button>

        <button
          onClick={continueNext}
          className="rounded-xl bg-blue-600 px-6 py-3 text-white"
        >
          Continue →
        </button>
      </div>
    </>
  );
}