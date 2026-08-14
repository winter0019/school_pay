'use client';

import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { User, Mail, Sparkles } from 'lucide-react';

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          } else {
            setUserProfile({
              displayName: user.displayName || user.email?.split('@')[0],
              email: user.email,
            });
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <User className="w-6 h-6 text-indigo-400" /> User Profile
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage your account information and preferences.</p>
        </div>

        {loading ? (
          <div className="p-8 bg-slate-900 rounded-2xl animate-pulse h-40"></div>
        ) : userProfile ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-xl font-bold text-indigo-300">
                {userProfile.displayName ? userProfile.displayName.slice(0, 2).toUpperCase() : 'NY'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{userProfile.displayName}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5" /> {userProfile.email}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-900 rounded-2xl text-center text-xs text-slate-400">
            Please log in to view your profile.
          </div>
        )}
      </div>
    </main>
  );
}