'use client';

import React, { RefObject } from 'react';
import { PhoneOff, Video, Phone } from 'lucide-react';

interface ActiveCallProps {
  peerName: string;
  callType: 'audio' | 'video' | null;
  callStatus: 'ringing' | 'connected';
  localVideoRef: RefObject<HTMLVideoElement | null>;
  remoteVideoRef: RefObject<HTMLVideoElement | null>;
  onEndCall: () => void;
}

export function ActiveCall({
  peerName,
  callType,
  callStatus,
  localVideoRef,
  remoteVideoRef,
  onEndCall,
}: ActiveCallProps) {
  const initials = peerName ? peerName.slice(0, 2).toUpperCase() : 'PE';

  return (
    <div className="absolute inset-0 bg-slate-950/95 z-30 flex flex-col items-center justify-center p-6 space-y-6 backdrop-blur-md">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-2xl font-bold text-indigo-300 mx-auto animate-pulse shadow-lg">
          {initials}
        </div>
        <h3 className="text-lg font-bold text-white">
          {callType === 'video' ? 'Video Call with' : 'Audio Call with'} {peerName}
        </h3>
        <p className={`text-xs font-medium ${callStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
          {callStatus === 'ringing' ? 'Ringing...' : 'Connected • Secure WebRTC Stream'}
        </p>
      </div>

      {callType === 'video' && (
        <div className="w-full max-w-2xl aspect-video bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl flex">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <div className="absolute bottom-4 right-4 w-32 aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-lg">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={onEndCall}
          className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-rose-600/30"
          type="button"
        >
          <PhoneOff className="w-4 h-4" /> End Call
        </button>
      </div>
    </div>
  );
}