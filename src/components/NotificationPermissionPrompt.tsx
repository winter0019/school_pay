'use client';

import React from 'react';
import { Bell } from 'lucide-react';

export default function NotificationPermissionPrompt() {
  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Notifications Enabled!', {
          body: 'You will now receive sound and push alerts for new messages.',
        });
      } else {
        alert('Permission denied for notifications.');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-4 max-w-md">
      <div>
        <h4 className="text-xs font-bold text-white">Enable Push Alerts</h4>
        <p className="text-[11px] text-slate-400">Get notified instantly when friends send messages or requests.</p>
      </div>
      <button
        onClick={handleRequestPermission}
        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
      >
        <Bell className="w-3.5 h-3.5" /> Enable
      </button>
    </div>
  );
}