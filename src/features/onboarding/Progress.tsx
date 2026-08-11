"use client";

import { motion } from "framer-motion";
import { TOTAL_STEPS } from "./constants";

interface ProgressProps {
  step: number;
}

export default function Progress({ step }: ProgressProps) {
  const percentage = (step / TOTAL_STEPS) * 100;

  return (
    <div className="mb-10">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">
          Step {step} of {TOTAL_STEPS}
        </span>

        <span className="text-sm text-slate-500">
          {Math.round(percentage)}%
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <motion.div
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.35 }}
          className="h-full rounded-full bg-blue-600"
        />
      </div>
    </div>
  );
}