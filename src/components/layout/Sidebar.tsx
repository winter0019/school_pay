'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Compass,
  MessageSquare,
  ShieldCheck,
  Star,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  Home,
  User,
} from 'lucide-react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firestore';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<{
    displayName: string;
    email: string;
    isGuest: boolean;
    isAdmin: boolean;
  }>({
    displayName: 'Peer User',
    email: 'guest@circleai.app',
    isGuest: true,
    isAdmin: false,
  });

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch role from /users/{uid} document
        let isAdminUser = false;
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            isAdminUser = true;
          }
        } catch (e) {
          console.warn('Could not verify admin role:', e);
        }

        setCurrentUser({
          displayName: user.displayName || user.email?.split('@')[0] || 'Peer Partner',
          email: user.email || 'guest@circleai.app',
          isGuest: user.isAnonymous,
          isAdmin: isAdminUser,
        });
      }
    });
    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.push('/login');
  };

  // Base navigation links available to everyone
  const navItems = [
    { label: 'Dashboard', href: '/conversations', icon: Home },
    { label: 'Find Circle', href: '/queue', icon: Compass },
    { label: 'Direct Chats', href: '/conversations/direct', icon: MessageSquare },
  ];

  // Dynamically include Admin Console ONLY if user is verified admin
  if (currentUser.isAdmin) {
    navItems.push({ label: 'Admin Console', href: '/admin', icon: ShieldCheck });
  }

  navItems.push({ label: 'Session Feedback', href: '/feedback', icon: Star });

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-slate-900 border-r border-slate-800 flex flex-col justify-between z-40 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* HEADER */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800/80">
          <Link href="/conversations" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-white text-base tracking-wide">
                  Circle<span className="text-indigo-400">AI</span>
                </span>
                <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
                  Peer Platform
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition flex-shrink-0"
            title={isCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/conversations'
                ? pathname === '/conversations'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold transition group relative ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition ${
                    isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}

                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-100 text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none shadow-xl border border-slate-700 transition z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* FOOTER */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-slate-950/50 border border-slate-800/60 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0 font-bold text-xs">
            <User className="w-4 h-4 text-indigo-400" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-white truncate">
                {currentUser.displayName}
              </span>
              <span className="text-[10px] text-slate-500 truncate">
                {currentUser.isAdmin ? 'System Admin' : currentUser.email}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-2xl bg-slate-800/50 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-semibold transition"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}