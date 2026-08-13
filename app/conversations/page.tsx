'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Compass,
  Users,
  MessageSquare,
  Sparkles,
  Clock,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Heart,
  Activity,
  Plus,
} from 'lucide-react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/firebase/firestore';

export default function DashboardPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    displayName: string;
    email: string;
  }>({
    uid: '',
    displayName: 'Peer Member',
    email: '',
  });

  const [stats, setStats] = useState({
    activeCircles: 3,
    totalMinutes: 120,
    safetyScore: 100,
  });

  const [recentRooms, setRecentRooms] = useState<any[]>([]);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Peer Member',
          email: user.email || '',
        });
        loadRecentRooms(user.uid);
      }
    });
    return () => unsub();
  }, []);

  const loadRecentRooms = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'rooms'),
        where('memberUids', 'array-contains', uid),
        limit(5)
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setRecentRooms(list);
    } catch (err) {
      console.warn('Could not load recent rooms:', err);
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-8">
      {/* WELCOME HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900 border border-slate-800 p-6 sm:p-8">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Welcome Back
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Hello, {currentUser.displayName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg">
              Meet people who truly understand. Join a 30-minute AI-facilitated circle or start a direct discussion.
            </p>
          </div>

          <button
            onClick={() => router.push('/queue')}
            className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition shadow-lg shadow-indigo-600/25 flex items-center gap-2 flex-shrink-0"
          >
            <Compass className="w-4 h-4" />
            <span>Join a Circle Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Circles Joined
            </span>
            <span className="text-xl font-bold text-white">{recentRooms.length || 3}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Time Spent Listening
            </span>
            <span className="text-xl font-bold text-white">90 mins</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
              Safety Score
            </span>
            <span className="text-xl font-bold text-white">100 / 100</span>
          </div>
        </div>
      </div>

      {/* RECENT CIRCLES & DIRECT MESSAGES ACTION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* RECENT CIRCLES */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" /> Recent Circles
            </h2>
            <button
              onClick={() => router.push('/queue')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Explore All Topics &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {recentRooms.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
                <Compass className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">You haven't joined any circles yet today.</p>
                <button
                  onClick={() => router.push('/queue')}
                  className="px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600/30 transition"
                >
                  Match with Peers
                </button>
              </div>
            ) : (
              recentRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => router.push(`/room/${room.roomId}`)}
                  className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition group"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-indigo-400 capitalize">
                      {room.topic || 'General'} Circle
                    </span>
                    <p className="text-xs text-slate-400">
                      Peers: {room.memberNames?.join(', ') || '3 Participants'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 group-hover:text-white transition text-xs font-semibold">
                    <span>Rejoin</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* DIRECT MESSAGES QUICK ENTRY */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" /> Direct Messaging
          </h2>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Private Conversations</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Stay connected 1-on-1 with peers you've met in past circles (friend request required).
              </p>
            </div>
            <button
              onClick={() => router.push('/conversations/direct')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition border border-slate-700 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Open Direct Chats</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}