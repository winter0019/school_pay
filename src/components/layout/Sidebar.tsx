"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: "Find Circle",
      href: "/discover",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      label: "Direct Chats",
      href: "/conversations/direct",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      label: "Session Feedback",
      href: "/feedback",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-4 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 font-bold text-white shadow-lg shadow-indigo-500/20">
            S
          </div>
          <span className="font-bold tracking-tight text-white">smartC</span>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity md:hidden"
        />
      )}

      {/* Persistent Sidebar Drawer */}
      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 flex flex-col border-r border-slate-800/80 bg-[#070913] p-4 transition-transform duration-300 ease-in-out w-64 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:static md:translate-x-0 ${
          isCollapsed ? "md:w-20" : "md:w-64"
        } shrink-0`}
      >
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 font-bold text-white shadow-lg shadow-indigo-500/25">
              S
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold tracking-tight text-white">
                  smartC
                </h1>
                <p className="text-[10px] font-semibold tracking-wider text-indigo-400 uppercase">
                  PEER PLATFORM
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white md:flex text-xs"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? "❯" : "❮"}
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-indigo-600/20 to-purple-600/10 text-indigo-400 border border-indigo-500/30 shadow-inner shadow-indigo-500/10"
                    : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                }`}
              >
                <span className={`shrink-0 transition-transform group-hover:scale-110 ${active ? "text-indigo-400" : "text-slate-400"}`}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer Profile / Branding */}
        {!isCollapsed && (
          <div className="mt-auto border-t border-slate-800/80 pt-4 px-1">
            <div className="flex items-center gap-3 rounded-xl bg-slate-900/40 p-2.5 border border-slate-800/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-950 border border-indigo-500/30 text-indigo-300 font-semibold text-xs">
                N
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-200">smartC</p>
                <p className="truncate text-[10px] text-slate-500">Connect • Collaborate</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}