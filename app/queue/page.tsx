'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Brain,
  Loader2,
  RefreshCw,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, query, where, getDocs, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { findDeepAffinityMatch } from '@/features/matching/services/affinityMatchingService';
import { PREDEFINED_TOPICS, generateGuestPseudonym } from '@/features/topics/data/predefinedTopics';

const PHILOSOPHICAL_LENSES = [
  { id: 'stoic', label: 'Stoic', desc: 'Focus on resilience & logic' },
  { id: 'pragmatic', label: 'Pragmatic', desc: 'Practical, action-oriented solutions' },
  { id: 'humanist', label: 'Humanist', desc: 'Empathy, growth & connection' },
  { id: 'existential', label: 'Existential', desc: 'Purpose, meaning & reflection' },
  { id: 'mindful', label: 'Mindful', desc: 'Presence, balance & awareness' },
  { id: 'open', label: 'Open-Minded', desc: 'Eager to learn any perspective' },
];

export default function QueuePage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pseudonym, setPseudonym] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('mental-wellness');
  const [philosophicalLens, setPhilosophicalLens] = useState<string>('stoic');

  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    setPseudonym(generateGuestPseudonym());

    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        if (user.displayName) {
          setPseudonym(user.displayName);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleRegeneratePseudonym = () => {
    setPseudonym(generateGuestPseudonym());
  };

  const handleJoinQueue = async () => {
    if (!currentUser) return;
    setIsSearching(true);

    const userId = currentUser.uid;
    const selectedTopic = PREDEFINED_TOPICS.find((t) => t.id === selectedTopicId);
    const topicName = selectedTopic ? selectedTopic.title : 'General';

    try {
      // 1. Submit queue document
      await setDoc(doc(db, 'queue', userId), {
        userId,
        userName: pseudonym,
        topic: topicName.toLowerCase().trim(),
        philosophicalLens,
        goal: 'perspective',
        language: 'en',
        status: 'waiting',
        joinedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Queue write error:', e);
    }

    const checkMatchedRoom = async () => {
      try {
        const roomsQuery = query(
          collection(db, 'rooms'),
          where('memberUids', 'array-contains', userId),
          where('status', '==', 'active')
        );
        const snap = await getDocs(roomsQuery);
        if (!snap.empty) {
          const matchedDoc = snap.docs[0];
          return matchedDoc.data().roomId || matchedDoc.id;
        }
      } catch (e) {
        console.warn('Room check error:', e);
      }
      return null;
    };

    // 2. Polling Loop with Safety Fallback
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const existingRoomId = await checkMatchedRoom();
        if (existingRoomId) {
          clearInterval(interval);
          router.push(`/room/${existingRoomId}`);
          return;
        }

        const createdRoomId = await findDeepAffinityMatch(topicName, 'en');
        if (createdRoomId) {
          clearInterval(interval);
          router.push(`/room/${createdRoomId}`);
          return;
        }

        // Fallback: If matching takes too long (> 12 seconds), auto-create a room so user is never stuck
        if (attempts >= 5) {
          clearInterval(interval);
          const fallbackRef = await addDoc(collection(db, 'rooms'), {
            topic: topicName,
            memberUids: [userId],
            status: 'active',
            createdAt: serverTimestamp(),
          });
          router.push(`/room/${fallbackRef.id}`);
        }
      } catch (err) {
        console.warn('Polling iteration error:', err);
      }
    }, 2500);

    // Timeout safety after 30 seconds
    setTimeout(() => {
      clearInterval(interval);
      setIsSearching(false);
    }, 30000);
  };

  const activeTopicObj = PREDEFINED_TOPICS.find((t) => t.id === selectedTopicId);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-8 backdrop-blur-md shadow-2xl z-10">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> 12 Predefined Circle Topics
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Select Your Circle & Identity</h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Choose a topic, customize your guest pseudonym for total privacy, and match with peers.
          </p>
        </header>

        {isSearching ? (
          <div className="p-12 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-white">AI Affinity Engine Matching...</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Scanning for peers aligned with <strong className="text-indigo-300">{activeTopicObj?.title}</strong> as <strong className="text-indigo-300">{pseudonym}</strong>...
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-400" /> Circle Display Pseudonym
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Privacy Protected</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={pseudonym}
                  onChange={(e) => setPseudonym(e.target.value)}
                  placeholder="Enter or generate pseudonym..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={handleRegeneratePseudonym}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Generate New Pseudonym"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Randomize</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Choose a Predefined Circle Focus (12 Available)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PREDEFINED_TOPICS.map((t) => {
                  const isSelected = selectedTopicId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTopicId(t.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{t.icon}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 uppercase font-bold">
                          {t.category}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white mb-1">{t.title}</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
                          {t.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-indigo-400" /> Philosophical Mindset / Worldview
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {PHILOSOPHICAL_LENSES.map((lens) => (
                  <button
                    key={lens.id}
                    type="button"
                    onClick={() => setPhilosophicalLens(lens.id)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      philosophicalLens === lens.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold block">{lens.label}</span>
                    <span className="text-[10px] opacity-70 block mt-1">{lens.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleJoinQueue}
              className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Match as "{pseudonym}"</span>
            </button>
          </div>
        )}
      </div>
    </main>
  );
}