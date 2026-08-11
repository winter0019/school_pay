'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDocs,
  where,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase/firestore';
import { Send, User, Sparkles, MessageSquare, Users } from 'lucide-react';

export default function DirectChatsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<{ uid: string; displayName: string } | null>(null);
  const [availablePeers, setAvailablePeers] = useState<any[]>([]);
  const [activePeer, setActivePeer] = useState<{ uid: string; displayName: string } | null>(null);

  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Authenticated User Observer
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userData = {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Peer Member',
        };
        setCurrentUser(userData);
        fetchOtherUsers(user.uid);
      }
    });
    return () => unsub();
  }, []);

  // 2. Fetch all other registered users from Firestore except currentUser
  const fetchOtherUsers = async (myUid: string) => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const peers: any[] = [];
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        // Exclude self from peer list
        if (docSnap.id !== myUid) {
          peers.push({
            uid: docSnap.id,
            displayName: data.displayName || data.email?.split('@')[0] || 'Peer Partner',
            email: data.email || '',
          });
        }
      });

      setAvailablePeers(peers);
      // Automatically select the first available peer if not selected yet
      if (peers.length > 0 && !activePeer) {
        setActivePeer(peers[0]);
      }
    } catch (err) {
      console.error('Error fetching peers:', err);
    }
  };

  // 3. Derive Conversation ID safely ONLY when currentUser & activePeer exist
  useEffect(() => {
    if (!currentUser?.uid || !activePeer?.uid) return;

    const sortedUids = [currentUser.uid, activePeer.uid].sort();
    const convId = `direct_${sortedUids[0]}_${sortedUids[1]}`;
    setConversationId(convId);

    // Initialize conversation document shell
    const convRef = doc(db, 'conversations', convId);
    setDoc(
      convRef,
      {
        conversationId: convId,
        participantIds: sortedUids,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch((err) => console.warn('Conversation init non-fatal:', err));
  }, [currentUser, activePeer]);

  // 4. Subscribe to messages for the active conversation
  useEffect(() => {
    if (!conversationId || !currentUser?.uid) return;

    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setMessages(list);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      },
      (error) => {
        console.warn('Snapshot listener error:', error);
      }
    );

    return () => unsub();
  }, [conversationId, currentUser]);

  // 5. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !conversationId || !currentUser) return;

    const currentText = text.trim();
    setText('');

    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      conversationId,
      senderUid: currentUser.uid,
      senderName: currentUser.displayName,
      text: currentText,
      createdAt: serverTimestamp(),
    });

    await setDoc(
      doc(db, 'conversations', conversationId),
      {
        lastMessage: currentText,
        lastSenderUid: currentUser.uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const formatMessageTime = (createdAt: any) => {
    if (!createdAt) return 'Just now';
    const date = createdAt.seconds ? new Date(createdAt.seconds * 1000) : new Date(createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <main className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* PEERS LIST SIDEBAR */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-800 font-bold text-sm text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            Direct Chats
          </span>
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
        </div>

        <div className="p-2 space-y-1 overflow-y-auto flex-1">
          {availablePeers.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 space-y-1">
              <Users className="w-6 h-6 mx-auto text-slate-700 mb-2" />
              <p>No other peers found.</p>
            </div>
          ) : (
            availablePeers.map((peer) => {
              const isSelected = activePeer?.uid === peer.uid;
              const initials = peer.displayName
                ? peer.displayName.slice(0, 2).toUpperCase()
                : 'P';

              return (
                <div
                  key={peer.uid}
                  onClick={() => setActivePeer(peer)}
                  className={`p-3 rounded-2xl flex items-center gap-3 cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                      : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-xs flex-shrink-0">
                    {initials}
                  </div>
                  <div className="truncate min-w-0 flex-1">
                    <h4 className="text-xs font-bold truncate">{peer.displayName}</h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {peer.email || 'Click to chat'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* CHAT WINDOW */}
      <section className="flex-1 flex flex-col bg-slate-950 min-w-0">
        {/* CHAT HEADER */}
        {activePeer ? (
          <>
            <header className="p-4 border-b border-slate-800 bg-slate-900 font-bold text-sm text-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-sm font-bold text-white">{activePeer.displayName}</span>
                <span className="block text-[10px] text-slate-400 font-normal">
                  Active Direct Message
                </span>
              </div>
            </header>

            {/* MESSAGES FEED */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
                  <MessageSquare className="w-8 h-8 text-slate-700" />
                  <p className="text-xs">No messages yet with {activePeer.displayName}. Say hello!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderUid === currentUser?.uid;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-slate-500 mb-1 px-1">
                        {isMe ? 'You' : m.senderName || 'Peer'} • {formatMessageTime(m.createdAt)}
                      </span>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* COMPOSER */}
            <footer className="p-3 bg-slate-900 border-t border-slate-800">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 max-w-4xl mx-auto"
              >
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Message ${activePeer.displayName}...`}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            Select a peer from the left sidebar to start chatting.
          </div>
        )}
      </section>
    </main>
  );
}