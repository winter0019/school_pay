'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Star,
  Brain,
  CheckCircle2,
  ArrowRight,
  Heart,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { saveUserSessionMemory } from '@/features/ai/services/memoryService';
import { updateUserReputation } from '@/features/reputation/services/reputationService';

function FeedbackForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomId = searchParams.get('roomId') || 'general_room';

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [rating, setRating] = useState<number>(5);
  const [feltHeard, setFeltHeard] = useState<boolean>(true);
  const [keyTakeaway, setKeyTakeaway] = useState<string>('');
  const [actionItem, setActionItem] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmitting(true);

    const userId = currentUser.uid;
    const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Peer';

    // 1. Save memory for future circle introductions
    if (keyTakeaway.trim() || actionItem.trim()) {
      await saveUserSessionMemory({
        userId,
        userName,
        topic: 'Peer Circle',
        keyTakeaway: keyTakeaway.trim() || 'Gained valuable peer perspectives.',
        actionItem: actionItem.trim() || 'Continue daily commitments.',
      });
    }

    // 2. Update reputation metrics
    await updateUserReputation(userId, {
      feltHeard,
      helpfulRating: rating,
      empatheticRating: rating,
    });

    setIsSubmitting(false);
    setIsSaved(true);

    setTimeout(() => {
      router.push('/conversations');
    }, 2000);
  };

  return (
    <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative z-10">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <Brain className="w-3.5 h-3.5" /> AI Memory Engine & Feedback
        </div>
        <h1 className="text-2xl font-bold text-white">Session Summary & Reflection</h1>
        <p className="text-xs text-slate-400">
          Save your key insights so your AI Host remembers your progress in your next circle.
        </p>
      </header>

      {isSaved ? (
        <div className="p-8 text-center space-y-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
          <h3 className="text-lg font-bold text-white">Memory Saved!</h3>
          <p className="text-xs text-slate-300">
            Your AI Host will personalize your next session based on your goals. Redirecting to dashboard...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmitFeedback} className="space-y-5">
          {/* RATING */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              How valuable was today's session?
            </label>
            <div className="flex items-center gap-2 justify-center py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-2 transition transform hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-700 fill-slate-800'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* FELT HEARD TOGGLE */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400" /> Did you feel heard and supported?
            </span>
            <button
              type="button"
              onClick={() => setFeltHeard((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                feltHeard
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {feltHeard ? 'Yes, absolutely' : 'Could be better'}
            </button>
          </div>

          {/* AI MEMORY INPUT 1: KEY TAKEAWAY */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              What was your biggest takeaway?
            </label>
            <input
              type="text"
              required
              value={keyTakeaway}
              onChange={(e) => setKeyTakeaway(e.target.value)}
              placeholder="e.g., Consistency matters more than perfection."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* AI MEMORY INPUT 2: ACTION ITEM */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              What is 1 action step you plan to take?
            </label>
            <input
              type="text"
              required
              value={actionItem}
              onChange={(e) => setActionItem(e.target.value)}
              placeholder="e.g., Dedicate 15 minutes every morning to strategic planning."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>Save Memory & Return to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden flex items-center justify-center">
      <Suspense fallback={<div className="text-xs text-slate-500">Loading feedback form...</div>}>
        <FeedbackForm />
      </Suspense>
    </main>
  );
}