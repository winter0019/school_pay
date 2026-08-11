'use client';

import React from 'react';
import { Sparkles, UserPlus } from 'lucide-react';
import type { PeerProfile } from './matchingService';

interface SuggestedPeerCardProps {
  peer: PeerProfile;
  onConnect: (peerUid: string) => void;
}

export function SuggestedPeerCard({ peer, onConnect }: SuggestedPeerCardProps) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition group">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {peer.photoURL ? (
              <img
                src={peer.photoURL}
                alt={peer.displayName}
                className="w-12 h-12 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center border border-indigo-500/30">
                {peer.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-slate-100 text-sm group-hover:text-indigo-300 transition">
                {peer.displayName}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-1">{peer.bio}</p>
            </div>
          </div>

          {/* Compatibility Score Badge */}
          <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0">
            <Sparkles className="w-3 h-3" />
            <span>{peer.compatibilityScore}%</span>
          </div>
        </div>

        {/* Interests Pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {peer.interests?.slice(0, 3).map((interest, idx) => (
            <span
              key={idx}
              className="text-[10px] bg-slate-950 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-md"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onConnect(peer.uid)}
        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
      >
        <UserPlus className="w-3.5 h-3.5" />
        <span>Connect & Chat</span>
      </button>
    </div>
  );
}