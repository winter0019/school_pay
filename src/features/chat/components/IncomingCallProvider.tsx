'use client';

import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { incomingCallService, IncomingCallNotification } from '../services/incomingCallService';
import { callService } from '../services/callService';
import { useRouter } from 'next/navigation';

export function IncomingCallProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const [activeIncomingCall, setActiveIncomingCall] = useState<IncomingCallNotification | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = incomingCallService.subscribeToIncomingCalls(userId, (calls) => {
      if (calls.length > 0) {
        setActiveIncomingCall(calls[0]);
      } else {
        setActiveIncomingCall(null);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const handleAccept = async () => {
    if (!activeIncomingCall || !userId) return;
    const { conversationId, callId } = activeIncomingCall;

    await incomingCallService.clearIncomingCall(userId, callId);
    router.push(`/conversations/direct?conv=${conversationId}&autoAccept=true`);
  };

  const handleDecline = async () => {
    if (!activeIncomingCall || !userId) return;
    const { conversationId, callId } = activeIncomingCall;

    await incomingCallService.clearIncomingCall(userId, callId);
    await callService.writeCallHistory({
      conversationId,
      callerUid: activeIncomingCall.callerUid,
      receiverUid: userId,
      type: activeIncomingCall.type,
      direction: 'incoming',
      status: 'rejected',
    });
    await callService.removeActiveCall(conversationId);

    setActiveIncomingCall(null);
  };

  return (
    <>
      {children}
      {activeIncomingCall && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 rounded-2xl bg-slate-900/95 p-5 text-white shadow-2xl backdrop-blur-lg border border-slate-700 max-w-sm w-full animate-bounce">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
            <p className="font-semibold text-sm">Incoming {activeIncomingCall.type} call...</p>
          </div>
          <div>
            <h4 className="text-lg font-bold">{activeIncomingCall.callerName || 'Someone'}</h4>
            <p className="text-xs text-slate-400">is calling you</p>
          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={handleDecline}
              className="flex-1 rounded-xl bg-rose-600/80 hover:bg-rose-600 py-2 text-sm font-medium transition"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 py-2 text-sm font-medium transition"
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </>
  );
}