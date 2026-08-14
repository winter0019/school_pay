'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase/firestore';
import { Users, UserPlus, CheckCircle2, Clock, Search, Sparkles } from 'lucide-react';

export default function DiscoverPeoplePage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<{ uid: string; displayName: string; email: string } | null>(null);
  const [peers, setPeers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendships, setFriendships] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // 1. Authenticated User Observer & Auto-Registration Check
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userData = {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Peer Member',
          email: user.email || '',
        };
        setCurrentUser(userData);

        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
              displayName: userData.displayName,
              email: userData.email,
              bio: 'Active member on the platform.',
              interests: ['Collaboration', 'Networking'],
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.warn('Auto-registration non-fatal error:', err);
        }

        fetchPeersAndRelationships(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // 2. Fetch all registered users & friendships
  const fetchPeersAndRelationships = async (myUid: string) => {
    try {
      setLoading(true);
      const usersSnap = await getDocs(collection(db, 'users'));
      const allPeers: any[] = [];
      
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (docSnap.id !== myUid) {
          allPeers.push({
            uid: docSnap.id,
            displayName: data.displayName || data.email?.split('@')[0] || 'Peer Partner',
            email: data.email || '',
            bio: data.bio || 'Exploring platform connections and collaborative projects.',
            interests: data.interests || ['General', 'Networking'],
          });
        }
      });
      setPeers(allPeers);

      // Fetch friendships & requests
      const friendsSnap = await getDocs(
        query(collection(db, 'friends'), where('users', 'array-contains', myUid))
      );
      const sentReqSnap = await getDocs(
        query(collection(db, 'friend_requests'), where('senderUid', '==', myUid))
      );
      const recvReqSnap = await getDocs(
        query(collection(db, 'friend_requests'), where('receiverUid', '==', myUid))
      );

      const statusMap: Record<string, string> = {};

      friendsSnap.forEach((d) => {
        const data = d.data();
        const otherUser = data.users.find((u: string) => u !== myUid);
        if (otherUser) statusMap[otherUser] = 'friends';
      });

      sentReqSnap.forEach((d) => {
        const data = d.data();
        statusMap[data.receiverUid] = 'pending_sent';
      });

      recvReqSnap.forEach((d) => {
        const data = d.data();
        statusMap[data.senderUid] = 'pending_received';
      });

      setFriendships(statusMap);
    } catch (err) {
      console.error('Error fetching peers directory:', err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Send Friend Request
  const handleSendFriendRequest = async (targetPeer: any) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'friend_requests'), {
        senderUid: currentUser.uid,
        senderName: currentUser.displayName,
        receiverUid: targetPeer.uid,
        receiverName: targetPeer.displayName,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setFriendships((prev) => ({ ...prev, [targetPeer.uid]: 'pending_sent' }));
    } catch (err) {
      console.error('Failed to send friend request:', err);
    }
  };

  // 4. Filtered Peers
  const filteredPeers = peers.filter((peer) =>
    peer.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    peer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 animate-pulse" /> Peer Platform Discovery
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Discover People</h1>
            <p className="text-sm text-slate-400 mt-1">
              Find people who share your interests, personality and goals.
            </p>
          </div>

          {/* SEARCH BAR */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search peers by name..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* PEERS GRID */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 h-48 animate-pulse"></div>
            ))}
          </div>
        ) : filteredPeers.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-12 text-center space-y-3 max-w-md mx-auto my-12">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">No people found</h3>
            <p className="text-xs text-slate-400">
              Try changing your search filters or check back when more members join the platform.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPeers.map((peer) => {
              const relation = friendships[peer.uid] || 'none';
              const initials = peer.displayName ? peer.displayName.slice(0, 2).toUpperCase() : 'P';

              return (
                <div
                  key={peer.uid}
                  className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-sm flex-shrink-0">
                        {initials}
                      </div>
                      <div className="truncate min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">{peer.displayName}</h3>
                        <p className="text-[11px] text-slate-400 truncate">{peer.email}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {peer.bio}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {peer.interests.map((interest: string, i: number) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-medium"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      {relation === 'friends'
                        ? 'Connected'
                        : relation === 'pending_sent'
                        ? 'Request Pending'
                        : relation === 'pending_received'
                        ? 'Pending Acceptance'
                        : 'Available'}
                    </span>

                    <div>
                      {relation === 'friends' ? (
                        <button
                          onClick={() => router.push('/conversations/direct')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500/20 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Chat
                        </button>
                      ) : relation === 'pending_sent' ? (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Sent
                        </span>
                      ) : relation === 'pending_received' ? (
                        <button
                          onClick={() => router.push('/conversations/direct')}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow"
                        >
                          View Request
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSendFriendRequest(peer)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Connect
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}