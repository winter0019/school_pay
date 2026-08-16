'use client';

import React from 'react';

interface CallRecord {
  id: string;
  type: 'audio' | 'video';
  direction: 'outgoing' | 'incoming';
  status: 'accepted' | 'missed' | 'rejected' | 'cancelled';
  createdAt?: { seconds: number };
}

interface CallHistoryProps {
  history: CallRecord[];
  onHide: () => void;
}

export function CallHistory({ history, onHide }: CallHistoryProps) {
  if (!history || history.length === 0) return null;

  return (
    <div className="border-b border-slate-800 bg-slate-950/70 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">📞</span>
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Call History & Records
          </span>
          <span className="text-[10px] text-slate-500">
            ({history.length})
          </span>
        </div>
        <button
          type="button"
          onClick={onHide}
          className="text-[10px] text-indigo-400 hover:text-indigo-300 transition"
        >
          Hide
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {history.slice(0, 12).map((call) => {
          const isOutgoing = call.direction === 'outgoing';
          const isAccepted = call.status === 'accepted';
          const isMissed = call.status === 'missed';
          const isRejected = call.status === 'rejected';
          const isVideo = call.type === 'video';

          return (
            <div
              key={call.id}
              className={`min-w-[190px] rounded-2xl border px-3 py-2.5 flex-shrink-0 ${
                isMissed
                  ? 'border-rose-500/30 bg-rose-500/5'
                  : isAccepted
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-slate-800 bg-slate-900/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {isMissed ? '📵' : isVideo ? '🎥' : '📞'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-white truncate">
                    {isMissed
                      ? 'Missed Call'
                      : isRejected
                        ? 'Declined Call'
                        : isOutgoing
                          ? 'Outgoing Call'
                          : 'Incoming Call'}
                  </div>
                  <div className={`text-[10px] font-semibold ${
                    isMissed ? 'text-rose-400' : isAccepted ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {isAccepted ? '✅ Accepted' : isMissed ? '❌ Missed' : '🚫 Declined'}
                  </div>
                </div>
                <span className="text-sm">
                  {isOutgoing ? '↗️' : '↙️'}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-[9px] text-slate-500">
                <span>
                  {call.createdAt?.seconds
                    ? new Date(call.createdAt.seconds * 1000).toLocaleString([], {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Just now'}
                </span>
                <span>{isVideo ? '🎥 Video' : '🎙️ Audio'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}