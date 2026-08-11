'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { MessageSquare, Search, Users, Sparkles, ChevronRight } from 'lucide-react';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface Conversation {
  id: string;
  participantIds: string[];
  lastMessage?: string;
  lastMessageType?: string;
  lastSenderUid?: string;
  lastMessageAt?: any;
  unreadCount?: Record<string, number>;
  typing?: Record<string, boolean>;
  updatedAt?: any;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  online?: boolean;
}

export default function ConversationsPage() {
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [partnerProfiles, setPartnerProfiles] = useState<Record<string, UserProfile>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 1. Listen for active authenticated user
  useEffect(() => {
    const auth = getAuth();
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
      } else {
        setCurrentUserId(null);
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // 2. Subscribe to active user's conversations in real time
  useEffect(() => {
    if (!currentUserId) return;

    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', currentUserId),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const convs: Conversation[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as DocumentData;
          return {
            id: docSnap.id,
            participantIds: data.participantIds || [],
            lastMessage: data.lastMessage || '',
            lastMessageType: data.lastMessageType || 'text',
            lastSenderUid: data.lastSenderUid || '',
            lastMessageAt: data.lastMessageAt || null,
            unreadCount: data.unreadCount || {},
            typing: data.typing || {},
            updatedAt: data.updatedAt || null,
          };
        });

        setConversations(convs);
        setLoading(false);

        // Fetch missing partner user profiles
        const partnerUidsToFetch = convs
          .flatMap((c) => c.participantIds)
          .filter((uid) => uid !== currentUserId && !partnerProfiles[uid]);

        if (partnerUidsToFetch.length > 0) {
          const newProfiles: Record<string, UserProfile> = {};
          await Promise.all(
            partnerUidsToFetch.map(async (uid) => {
              try {
                const userSnap = await getDoc(doc(db, 'users', uid));
                if (userSnap.exists()) {
                  newProfiles[uid] = userSnap.data() as UserProfile;
                } else {
                  newProfiles[uid] = { uid, displayName: 'Peer Partner' };
                }
              } catch (err) {
                console.error(`Error loading profile for ${uid}:`, err);
                newProfiles[uid] = { uid, displayName: 'Peer Partner' };
              }
            })
          );
          setPartnerProfiles((prev) => ({ ...prev, ...newProfiles }));
        }
      },
      (error) => {
        console.error('Error fetching conversations:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  // Filter conversations by search term
  const filteredConversations = conversations.filter((conv) => {
    const partnerUid = conv.participantIds.find((id) => id !== currentUserId) || '';
    const partner = partnerProfiles[partnerUid];
    const partnerName = partner?.displayName?.toLowerCase() || '';
    const lastMsg = conv.lastMessage?.toLowerCase() || '';
    const queryTerm = searchQuery.toLowerCase();

    return partnerName.includes(queryTerm) || lastMsg.includes(queryTerm);
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 relative overflow-hidden flex flex-col items-center">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-3xl w-full space-y-6 z-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-1">
              <MessageSquare className="w-4 h-4" /> Real-time Messages
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Conversations
            </h1>
          </div>

          <Link
            href="/friends"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition shadow-lg shadow-indigo-600/20"
          >
            <Users className="w-4 h-4" /> Start New Chat
          </Link>
        </header>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations by name or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Conversation List */}
        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-slate-900/40 border border-slate-800/60 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/30 border border-slate-800/60 rounded-2xl space-y-4">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-200">No conversations found</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? 'No messages match your search filter.'
                  : 'Connect with peers from Discover or your Friends list to start chatting.'}
              </p>
            </div>
            {!searchQuery && (
              <Link
                href="/friends"
                className="inline-block px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                Browse Friends List
              </Link>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2.5"
          >
            <AnimatePresence>
              {filteredConversations.map((conv) => {
                const partnerUid =
                  conv.participantIds.find((id) => id !== currentUserId) || '';
                const partner = partnerProfiles[partnerUid];
                const displayName = partner?.displayName || 'Peer Partner';
                const avatar = partner?.photoURL;
                const unread = currentUserId ? conv.unreadCount?.[currentUserId] || 0 : 0;
                const isTyping = conv.typing?.[partnerUid] || false;

                return (
                  <motion.div
                    key={conv.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => router.push(`/chat/${conv.id}`)}
                    className="cursor-pointer group rounded-2xl p-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all duration-200 flex items-center justify-between gap-4"
                  >
                    {/* Left: Avatar & Info */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="relative flex-shrink-0">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={displayName}
                            className="w-12 h-12 rounded-full object-cover border border-slate-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-base flex items-center justify-center border border-indigo-500/30">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {partner?.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-slate-100 truncate text-base group-hover:text-indigo-400 transition-colors">
                            {displayName}
                          </h3>
                        </div>

                        {/* Last Message / Typing Status */}
                        <div className="text-sm truncate">
                          {isTyping ? (
                            <span className="text-indigo-400 font-medium italic animate-pulse">
                              typing...
                            </span>
                          ) : (
                            <span
                              className={
                                unread > 0
                                  ? 'text-slate-100 font-semibold'
                                  : 'text-slate-400'
                              }
                            >
                              {conv.lastMessage || 'No messages yet'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Unread Badge & Arrow */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {unread > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/30">
                          {unread}
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </main>
  );
}