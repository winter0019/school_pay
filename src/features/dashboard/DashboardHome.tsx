'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  Sparkles,
  MessageSquare,
  Users,
  UserCheck,
  User,
  Compass,
  ArrowRight,
} from 'lucide-react';

export default function DashboardHome() {
  const [displayName, setDisplayName] = useState<string>('Peer Member');
  const [greeting, setGreeting] = useState<string>('Good Morning');

  useEffect(() => {
    // 1. Calculate dynamic greeting based on local time
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 18) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }

    // 2. Fetch authenticated user profile details from Firebase
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const name = user.displayName || user.email?.split('@')[0] || 'Peer Member';
        setDisplayName(name);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto">
      {/* WELCOME BANNER */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            {greeting}, <span className="text-indigo-400">{displayName}</span> 👋
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xl">
            Welcome back to ConversationOS. Your AI companion is ready to help you discover meaningful conversations around the world.
          </p>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Profile Completion</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">100%</p>
          <p className="text-[11px] text-slate-500">Your profile is complete.</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>AI Match Score</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">75%</p>
          <p className="text-[11px] text-slate-500">Calculated from your profile.</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Connections</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-[11px] text-slate-500">People you&apos;ve connected with.</p>
        </div>
      </div>

      {/* QUICK ACTIONS GRID */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-200">Quick Actions</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* ACTION 1: 30-MIN AI GROUP ROOM (FEATURED) */}
          <Link
            href="/queue"
            className="p-5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl hover:border-indigo-500 hover:bg-indigo-900/30 transition group flex flex-col justify-between space-y-4 shadow-lg shadow-indigo-950/20"
          >
            <div className="flex items-center justify-between">
              <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/30 group-hover:scale-105 transition">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                30-Min AI Circle
              </span>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm group-hover:text-indigo-300 transition flex items-center justify-between">
                Join AI Circle <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Get paired with 2 matching peers for a 30-min AI-facilitated discussion.
              </p>
            </div>
          </Link>

          {/* ACTION 2: START 1-ON-1 CONVERSATION */}
          <Link
            href="/conversations"
            className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-slate-700 hover:bg-slate-900 transition group flex flex-col justify-between space-y-4"
          >
            <div className="p-3 bg-slate-800 text-slate-300 rounded-xl w-fit group-hover:text-white transition">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm group-hover:text-indigo-400 transition">
                Direct Chat
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Talk with people instantly in 1-on-1 private rooms.
              </p>
            </div>
          </Link>

          {/* ACTION 3: AI MATCH */}
          <Link
            href="/match"
            className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-slate-700 hover:bg-slate-900 transition group flex flex-col justify-between space-y-4"
          >
            <div className="p-3 bg-slate-800 text-amber-400 rounded-xl w-fit group-hover:scale-105 transition">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition">
                AI Match
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Get personalized recommendations based on profile goals.
              </p>
            </div>
          </Link>

          {/* ACTION 4: EDIT PROFILE */}
          <Link
            href="/profile"
            className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl hover:border-slate-700 hover:bg-slate-900 transition group flex flex-col justify-between space-y-4"
          >
            <div className="p-3 bg-slate-800 text-slate-300 rounded-xl w-fit group-hover:text-white transition">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm group-hover:text-indigo-400 transition">
                Edit Profile
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Update your topic interests and preferences.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}