'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, addDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/firebase/firestore';
import { Sparkles, Clock, Send, ShieldAlert, LogOut } from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;

  const [roomData, setRoomData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(1800); // 30 Minutes
  const [currentUserId, setCurrentUserId] = useState('KCojjKOZD0SzPjRzfazoPUQ9JLf1');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const auth = getAuth();
    if (auth.currentUser) {
      setCurrentUserId(auth.currentUser.uid);
    }
  }, []);

  // 1. Room Subscription & Timer
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
    });

    // Messages Subscription
    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubMessages = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMessages(list);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => {
      unsubRoom();
      unsubMessages();
    };
  }, [roomId]);

  // 2. Countdown Timer Ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push('/conversations');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !roomId) return;

    const currentText = text.trim();
    setText('');

    await addDoc(collection(db, 'rooms', roomId, 'messages'), {
      roomId,
      senderUid: currentUserId,
      senderName: roomData?.memberNames?.[0] || 'Peer',
      text: currentText,
      createdAt: serverTimestamp(),
    });
  };

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <main className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* HEADER */}
      <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10">
        <div>
          <h2 className="font-bold text-white text-sm sm:text-base capitalize">
            {roomData?.topic || 'Group'} Circle
          </h2>
          <p className="text-xs text-slate-400">{roomData?.memberNames?.join(', ') || '3 Members'}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatCountdown(remainingSeconds)}</span>
          </div>

          <button
            onClick={() => router.push('/conversations')}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* AI FACILITATOR BANNER */}
      <div className="bg-indigo-600/15 border-b border-indigo-500/30 p-3 text-xs text-indigo-300 flex items-start gap-2.5 z-10">
        <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5 animate-pulse" />
        <div>
          <span className="font-bold text-indigo-200 uppercase tracking-wider text-[10px] block mb-0.5">
            AI Facilitator Prompt
          </span>
          <span>{roomData?.currentAiPrompt || 'Welcome! Introduce yourselves to get started.'}</span>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => {
          const isMe = m.senderUid === currentUserId;
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-slate-500 mb-1 px-1">{m.senderName || 'Peer'}</span>
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

      {/* COMPOSER */}
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