'use client';

import React, { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, addDoc, query, orderBy, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase/firestore';
import {
  Sparkles,
  Clock,
  Send,
  LogOut,
  ShieldAlert,
  Volume2,
  VolumeX,
  Play,
  Square,
  Crown,
  Lightbulb,
  CheckCircle2,
  Sparkle,
} from 'lucide-react';
import { checkMessageContent, logModerationViolation } from '@/features/moderation/services/moderationService';
import { AI_VOICES, speakWithNamedVoice, stopNamedVoice } from '@/features/audio/services/namedVoiceService';
import { generateCircleDeepResearch, SmartSolutionsSummary } from '@/features/research/services/deepResearchService';

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams?.roomId;
  const router = useRouter();

  const [roomData, setRoomData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(1800);

  const [selectedVoiceId, setSelectedVoiceId] = useState<'hiba' | 'adal' | 'batool'>('hiba');
  const [isSpeakMode, setIsSpeakMode] = useState<boolean>(true);
  const [isPlayingVoice, setIsPlayingVoice] = useState<boolean>(false);

  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [summaryReport, setSummaryReport] = useState<SmartSolutionsSummary | null>(null);

  const [currentUser, setCurrentUser] = useState<{ uid: string; displayName: string }>({
    uid: 'guest_user',
    displayName: 'Peer Member',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Peer Member',
        });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const roomRef = doc(db, 'rooms', roomId);
    const unsubRoom = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoomData(data);

        if (data.endTime) {
          const endMs = data.endTime.seconds ? data.endTime.seconds * 1000 : new Date(data.endTime).getTime();
          const diffSecs = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
          setRemainingSeconds(diffSecs);
        }
      }
    }, (err) => {
      console.warn('Room listener permission or network notice:', err);
    });

    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubMessages = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMessages(list);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      console.warn('Messages listener notice:', err);
    });

    return () => {
      unsubRoom();
      unsubMessages();
      stopNamedVoice();
    };
  }, [roomId]);

  const handleSpeakText = (script: string) => {
    if (!isSpeakMode) return;
    setIsPlayingVoice(true);
    speakWithNamedVoice(script, selectedVoiceId, () => {
      setIsPlayingVoice(false);
    });
  };

  const handleStopVoice = () => {
    stopNamedVoice();
    setIsPlayingVoice(false);
  };

  const handleExitCircle = async () => {
    stopNamedVoice();
    
    try {
      if (roomId) {
        const roomRef = doc(db, 'rooms', roomId);
        await updateDoc(roomRef, { status: 'completed' });
      }

      if (currentUser.uid && currentUser.uid !== 'guest_user') {
        await deleteDoc(doc(db, 'queue', currentUser.uid));
      }
    } catch (err) {
      console.warn('Exit cleanup notice:', err);
    }

    router.push(`/feedback?roomId=${roomId}`);
  };

  const handleGenerateSummary = async () => {
    if (!roomId || messages.length === 0) return;
    setIsGeneratingSummary(true);

    const messageTexts = messages.map((m) => m.text);
    const topic = roomData?.topic || 'General';

    const report = await generateCircleDeepResearch(roomId, topic, messageTexts);
    setSummaryReport(report);
    setIsGeneratingSummary(false);

    if (isSpeakMode) {
      handleSpeakText(report.voiceSummaryScript);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !roomId) return;

    const rawText = text.trim();
    setText('');

    const modResult = checkMessageContent(rawText);

    try {
      await addDoc(collection(db, 'rooms', roomId, 'messages'), {
        roomId,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName,
        text: modResult.cleanText,
        isFlagged: modResult.isFlagged,
        createdAt: serverTimestamp(),
      });

      if (modResult.isFlagged) {
        await addDoc(collection(db, 'rooms', roomId, 'messages'), {
          roomId,
          senderUid: 'system_ai_moderator',
          senderName: 'AI Safety System',
          text: `Reminder: Please keep the conversation respectful and constructive.`,
          type: 'system_warning',
          createdAt: serverTimestamp(),
        });

        await logModerationViolation({
          roomId,
          flaggedUserUid: currentUser.uid,
          flaggedUserName: currentUser.displayName,
          originalText: rawText,
          reason: modResult.reason || 'Flagged for explicit wording.',
          severity: modResult.severity || 'medium',
        });
      }
    } catch (err) {
      console.error('Failed to send message or save session memory:', err);
    }
  };

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activeVoice = AI_VOICES[selectedVoiceId];

  return (
    <main className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-10 flex-shrink-0">
        <div>
          <h2 className="font-bold text-white text-sm sm:text-base capitalize flex items-center gap-2">
            <span>{roomData?.topic || 'General'} Circle</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-normal flex items-center gap-1">
              <span>{activeVoice.avatarIcon}</span>
              <span>Host: {activeVoice.name}</span>
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['hiba', 'adal', 'batool'] as const).map((vId) => (
              <button
                key={vId}
                onClick={() => setSelectedVoiceId(vId)}
                className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition ${
                  selectedVoiceId === vId
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {AI_VOICES[vId].name}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (isPlayingVoice) handleStopVoice();
              setIsSpeakMode((prev) => !prev);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              isSpeakMode
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {isSpeakMode ? <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isSpeakMode ? 'Speak Mode ON' : 'Mute Voice'}</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatCountdown(remainingSeconds)}</span>
          </div>

          <button
            onClick={handleExitCircle}
            className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5"
            title="Exit Circle"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      <div className="bg-indigo-600/15 border-b border-indigo-500/30 p-3 text-xs text-indigo-300 flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <Sparkles className={`w-4 h-4 text-indigo-400 flex-shrink-0 ${isPlayingVoice ? 'animate-bounce' : ''}`} />
          <div className="truncate">
            <span className="font-bold text-indigo-200 uppercase tracking-wider text-[10px] block">
              AI Host ({activeVoice.name}) • {activeVoice.role}
            </span>
            <span className="truncate block text-slate-200">
              {roomData?.currentAiPrompt || 'Welcome everyone! Introduce yourselves to get started.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isPlayingVoice ? (
            <button
              onClick={handleStopVoice}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center gap-1 hover:bg-rose-500/30 transition"
            >
              <Square className="w-3 h-3 fill-rose-300" /> Stop Speech
            </button>
          ) : (
            <button
              onClick={() => handleSpeakText(roomData?.currentAiPrompt || 'Welcome to the circle!')}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 transition"
            >
              <Play className="w-3 h-3 fill-white" /> Listen
            </button>
          )}

          <button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[11px] font-extrabold flex items-center gap-1.5 shadow-md hover:brightness-110 transition disabled:opacity-50"
          >
            <Crown className="w-3.5 h-3.5 fill-slate-950" />
            <span>{isGeneratingSummary ? 'Analyzing...' : 'Smart Suggestions & Solutions'}</span>
          </button>
        </div>
      </div>

      {summaryReport && (
        <div className="m-4 p-5 rounded-2xl bg-slate-900 border border-amber-500/40 text-xs space-y-4 shadow-2xl relative animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Smart Suggestions & Possible Solutions</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase flex items-center gap-1">
              <Crown className="w-3 h-3 fill-amber-400" /> Premium Summary
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-indigo-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkle className="w-3.5 h-3.5 text-indigo-400" /> Smart Suggestions
              </h4>
              <ul className="space-y-1.5 text-slate-300">
                {summaryReport.smartSuggestions.map((sug, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-300">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{sug}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-emerald-300 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Possible Solutions
              </h4>
              <ul className="space-y-1.5 text-slate-300">
                {summaryReport.possibleSolutions.map((sol, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-300">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{sol}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => {
          if (m.type === 'system_warning' || m.senderUid === 'system_ai_moderator') {
            return (
              <div
                key={m.id}
                className="my-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5 max-w-lg mx-auto"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase text-[10px] tracking-wider block text-amber-400 mb-0.5">
                    {m.senderName}
                  </span>
                  <span>{m.text}</span>
                </div>
              </div>
            );
          }

          const isMe = m.senderUid === currentUser.uid;
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-slate-500 mb-1 px-1">
                {isMe ? 'You' : m.senderName || 'Peer'}
              </span>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  isMe
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-3 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            placeholder="Share your thoughts with the group..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </main>
  );
}