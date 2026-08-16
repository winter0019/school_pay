'use client';

import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';

interface IncomingCallBannerProps {
  callerName: string;
  type: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallBanner({
  callerName,
  type,
  onAccept,
  onReject,
}: IncomingCallBannerProps) {
  const initials = callerName ? callerName.slice(0, 2).toUpperCase() : 'PE';

  return (
    <div className="absolute inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center p-6 space-y-6 backdrop-blur-md animate-fade-in">
      <div className="text-center space-y-3">
        <div className="w-24 h-24 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-3xl font-bold text-indigo-300 mx-auto animate-bounce shadow-xl">
          {initials}
        </div>
        <h3 className="text-xl font-extrabold text-white flex items-center justify-center gap-2">
          {type === 'video' ? <Video className="w-5 h-5 text-indigo-400" /> : <Phone className="w-5 h-5 text-emerald-400" />}
          Incoming {type === 'video' ? 'Video' : 'Audio'} Call
        </h3>
        <p className="text-sm text-slate-300">
          <span className="font-bold text-indigo-400">{callerName}</span> is calling you...
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onReject}
          className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-rose-600/30"
          type="button"
        >
          <PhoneOff className="w-4 h-4" /> Reject
        </button>
        <button
          onClick={onAccept}
          className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-600/30"
          type="button"
        >
          <Phone className="w-4 h-4" /> Accept
        </button>
      </div>
    </div>
  );
}