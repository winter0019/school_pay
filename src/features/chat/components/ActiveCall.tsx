'use client';

import React, { useState, useEffect } from 'react';
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react';

interface ActiveCallProps {
  peerName: string;
  callType: 'audio' | 'video' | null;
  callStatus: 'ringing' | 'connected';
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
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
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    let timer: any = null;
    if (callStatus === 'connected') {
      timer = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callStatus]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const toggleMute = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      });
    }
  };

  const toggleVideo = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsVideoOff(!track.enabled);
      });
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-between p-6 text-white">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between max-w-2xl">
        <div>
          <h3 className="text-sm font-bold text-slate-300">Secure WebRTC Call</h3>
          <p className="text-xs text-indigo-400 capitalize">{callType} Call with {peerName}</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
          {callStatus === 'connected' ? formatTime(secondsElapsed) : 'Connecting...'}
        </div>
      </div>

      {/* Main Video / Avatar Display */}
      <div className="flex-1 w-full max-w-4xl flex items-center justify-center relative my-4">
        {callType === 'video' ? (
          <div className="relative w-full h-full rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-4 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-lg bg-black">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-28 h-28 rounded-full bg-indigo-600/20 border-2 border-indigo-500/50 flex items-center justify-center text-3xl font-bold shadow-2xl animate-pulse">
              {peerName ? peerName.slice(0, 2).toUpperCase() : 'P'}
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold">{peerName}</h2>
              <p className="text-xs text-emerald-400 mt-1 font-medium">
                {callStatus === 'connected' ? `Connected • ${formatTime(secondsElapsed)}` : 'Ringing...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center gap-4 py-4">
        <button
          type="button"
          onClick={toggleMute}
          className={`p-4 rounded-full transition shadow-lg ${isMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {callType === 'video' && (
          <button
            type="button"
            onClick={toggleVideo}
            className={`p-4 rounded-full transition shadow-lg ${isVideoOff ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
            title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </button>
        )}

        <button
          type="button"
          onClick={onEndCall}
          className="px-6 py-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 shadow-xl transition transform hover:scale-105"
          title="End Call"
        >
          <PhoneOff className="w-5 h-5" /> End Call
        </button>
      </div>
    </div>
  );
}