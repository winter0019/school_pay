'use client';

import React from 'react';
import { motion, type Transition } from 'framer-motion';

interface TypingIndicatorProps {
  partnerName?: string;
}

export function TypingIndicator({ partnerName }: TypingIndicatorProps) {
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -4 },
  };

  const dotTransition: Transition = {
    duration: 0.4,
    repeat: Infinity,
    repeatType: 'reverse',
    ease: 'easeInOut',
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-full w-fit">
      <span className="text-xs text-indigo-400 font-medium">
        {partnerName ? `${partnerName} is typing` : 'Typing'}
      </span>
      <div className="flex items-center gap-1">
        <motion.span
          className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ ...dotTransition, delay: 0 }}
        />
        <motion.span
          className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ ...dotTransition, delay: 0.15 }}
        />
        <motion.span
          className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{ ...dotTransition, delay: 0.3 }}
        />
      </div>
    </div>
  );
}