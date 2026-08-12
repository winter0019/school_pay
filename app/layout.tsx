'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem('smartc_sidebar_collapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem('smartc_sidebar_collapsed', String(nextState));
      return nextState;
    });
  };

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#020617] text-slate-100 antialiased selection:bg-indigo-600 selection:text-white">
        <div className="flex min-h-screen w-full overflow-x-hidden">
          {/* Root Sidebar (Rendered ONCE globally) */}
          <Sidebar
            isCollapsed={isCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />

          {/* Main Application Content Area */}
          <main
            className={`flex-1 min-w-0 transition-all duration-300 ease-in-out pt-20 md:pt-6 px-4 sm:px-6 md:px-8 pb-16 ${
              isCollapsed ? 'md:ml-20' : 'md:ml-64'
            }`}
          >
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}