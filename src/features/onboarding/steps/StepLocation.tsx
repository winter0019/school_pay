"use client";

import { useState } from "react";
import { useOnboardingStore } from "@/store/onboardingStore";

const countries = [
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "United States",
  "United Kingdom",
  "Canada",
  "India",
  "China",
];

const languages = [
  "English",
  "French",
  "Arabic",
  "Hausa",
  "Yoruba",
  "Igbo",
  "Chinese",
  "Spanish",
];

export default function StepLocation() {
  const data = useOnboardingStore((s) => s.data);
  const updateField = useOnboardingStore((s) => s.updateField);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const previousStep = useOnboardingStore((s) => s.previousStep);

  const [country, setCountry] = useState(data.country);
  const [language, setLanguage] = useState(data.language);

  function continueNext() {
    if (!country || !language) {
      alert("Please select your country and language.");
      return;
    }

    updateField("country", country);
    updateField("language", language);

    nextStep();
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-slate-900">
        Where are you from?
      </h1>

      <p className="mt-2 text-slate-500">
        This helps us recommend better conversations.
      </p>

      <div className="mt-8 space-y-5">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3"
        >
          <option value="">Select Country</option>

          {countries.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3"
        >
          <option value="">Preferred Language</option>

          {languages.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <div className="flex justify-between pt-4">
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
      </div>
    </>
  );
}