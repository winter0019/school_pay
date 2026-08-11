'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface SmartRepliesBarProps {
  replies: string[];
  onSelectReply: (reply: string) => void;
}

export function SmartRepliesBar({ replies, onSelectReply }: SmartRepliesBarProps) {
  if (!replies || replies.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        className="flex items-center gap-2 overflow-x-auto py-2 px-1 no-scrollbar mb-1"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 pl-1 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span className="hidden sm:inline">AI Suggest:</span>
        </div>

        <div className="flex items-center gap-2 flex-nowrap">
          {replies.map((replyText, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectReply(replyText)}
              className="text-xs bg-slate-900/90 border border-indigo-500/30 hover:border-indigo-500 text-indigo-200 hover:text-white px-3 py-1.5 rounded-full transition-all duration-150 whitespace-nowrap shadow-sm hover:scale-105 active:scale-95"
            >
              {replyText}
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}