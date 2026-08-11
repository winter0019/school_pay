'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, CheckCircle2, ListChecks } from 'lucide-react';
import type { ChatSummary } from './summaryService';

interface SummaryModalProps {
  isOpen: boolean;
  summary: ChatSummary | null;
  partnerName?: string;
  onClose: () => void;
}

export function SummaryModal({ isOpen, summary, partnerName, onClose }: SummaryModalProps) {
  if (!isOpen || !summary) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative text-slate-100"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">AI Thread Summary</h3>
              <p className="text-xs text-slate-400">Conversation with {partnerName || 'Peer'}</p>
            </div>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
              <p className="text-slate-300 leading-relaxed">{summary.overview}</p>
            </div>

            {summary.keyPoints.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Key Highlights
                </h4>
                <ul className="space-y-1.5 pl-2">
                  {summary.keyPoints.map((point, idx) => (
                    <li key={idx} className="text-slate-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.actionItems.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5" /> Follow-ups & Mentions
                </h4>
                <ul className="space-y-1.5 pl-2">
                  {summary.actionItems.map((item, idx) => (
                    <li key={idx} className="text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800/60">
                      "{item}"
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
          >
            Done
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}