'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';
import type { ModerationResult } from './moderationService';

interface ModerationWarningModalProps {
  isOpen: boolean;
  result: ModerationResult | null;
  onClose: () => void;
  onRewrite: () => void;
}

export function ModerationWarningModal({
  isOpen,
  result,
  onClose,
  onRewrite,
}: ModerationWarningModalProps) {
  if (!isOpen || !result) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-slate-100"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Content Safety Alert</h3>
              <p className="text-xs text-rose-400 font-medium capitalize">
                Flagged for {result.category || 'policy violation'}
              </p>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-5 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>{result.reason || 'This message violates community safety standards.'}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Edit Message
            </button>
            <button
              type="button"
              onClick={onRewrite}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-md shadow-indigo-600/20"
            >
              Auto-Sanitize
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}