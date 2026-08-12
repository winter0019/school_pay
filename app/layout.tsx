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
          {/* Persistent Sidebar */}
          <Sidebar
            isCollapsed={isCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />

          {/* Fluid Main Content Area */}
          <main className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0 overflow-y-auto">
            <div className="flex-1 w-full p-4 sm:p-6 md:p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}