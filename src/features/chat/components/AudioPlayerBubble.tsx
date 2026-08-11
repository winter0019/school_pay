'use client';

import React, { useState, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerBubbleProps {
  src: string;
  isMe: boolean;
}

export function AudioPlayerBubble({ src, isMe }: AudioPlayerBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-3 py-1 min-w-[180px]">
      <button
        type="button"
        onClick={togglePlay}
        className={`p-2.5 rounded-full flex-shrink-0 transition ${
          isMe
            ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>

      <div className="flex-1 flex items-center gap-1 h-5">
        {[0.3, 0.7, 0.4, 0.9, 0.5, 0.8, 0.3, 0.6, 0.4, 0.7, 0.2].map((heightScale, idx) => (
          <span
            key={idx}
            style={{ height: `${heightScale * 18}px` }}
            className={`w-1 rounded-full ${
              isMe ? 'bg-indigo-200' : 'bg-slate-400'
            }`}
          />
        ))}
      </div>

      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  );
}