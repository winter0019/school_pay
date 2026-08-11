"use client";

import { GOAL_OPTIONS } from "../constants";
import { useOnboardingStore } from "@/store/onboardingStore";

export default function StepGoals() {
  const data = useOnboardingStore((s) => s.data);
  const updateField = useOnboardingStore((s) => s.updateField);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const previousStep = useOnboardingStore((s) => s.previousStep);

  const goals = data.goals;

  function toggleGoal(goal: string) {
    if (goals.includes(goal)) {
      updateField(
        "goals",
        goals.filter((g) => g !== goal)
      );
    } else {
      updateField("goals", [...goals, goal]);
    }
  }

  function continueNext() {
    if (goals.length === 0) {
      alert("Please select at least one goal.");
      return;
    }

    nextStep();
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-slate-900">
        What brings you to ConversationOS?
      </h1>

      <p className="mt-2 text-slate-500">
        Select one or more goals.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {GOAL_OPTIONS.map((goal) => {
          const selected = goals.includes(goal);

          return (
            <button
              key={goal}
              type="button"
              onClick={() => toggleGoal(goal)}
              className={`rounded-full border px-4 py-2 transition ${
                selected
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {goal}
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