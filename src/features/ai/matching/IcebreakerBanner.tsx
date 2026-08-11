'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, MessageSquarePlus } from 'lucide-react';

interface IcebreakerBannerProps {
  partnerName: string;
  icebreakers: string[];
  onSelectIcebreaker: (text: string) => void;
}

export function IcebreakerBanner({
  partnerName,
  icebreakers,
  onSelectIcebreaker,
}: IcebreakerBannerProps) {
  if (!icebreakers || icebreakers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="p-4 bg-slate-900/90 border border-indigo-500/30 rounded-2xl shadow-xl max-w-lg mx-auto my-4 text-slate-100"
    >
      <div className="flex items-center gap-2 mb-3 text-indigo-400 font-semibold text-sm">
        <Sparkles className="w-4 h-4 animate-pulse" />
        <span>AI Conversation Starters for {partnerName}</span>
      </div>

      <div className="space-y-2">
        {icebreakers.map((starter, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectIcebreaker(starter)}
            className="w-full text-left p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 text-xs sm:text-sm text-slate-200 hover:text-white transition flex items-start gap-2.5 group"
          >
            <MessageSquarePlus className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
            <span className="leading-snug">{starter}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}