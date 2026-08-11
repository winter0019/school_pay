"use client";

import { AnimatePresence, motion } from "framer-motion";

import Progress from "./Progress";

import {
  StepProfile,
  StepLocation,
  StepInterests,
  StepGoals,
  StepPersonality,
  StepFinish,
} from "./index";

import { useOnboardingStore } from "@/store/onboardingStore";

export default function Wizard() {
  const step = useOnboardingStore((s) => s.step);

  const steps = [
    <StepProfile key={1} />,
    <StepLocation key={2} />,
    <StepInterests key={3} />,
    <StepGoals key={4} />,
    <StepPersonality key={5} />,
    <StepFinish key={6} />,
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 p-6">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-10 shadow-2xl">
        <Progress step={step} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.25 }}
          >
            {steps[step - 1]}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}