'use client';

import React, { useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/firestore';

export default function GlobalNotificationListener() {
  const playSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (err) {
      console.warn('Audio play error:', err);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      // Listen for incoming friend requests globally
      const reqQuery = query(
        collection(db, 'friend_requests'),
        where('receiverUid', '==', user.uid),
        where('status', '==', 'pending')
      );

      let isInitial = true;
      const unsubReq = onSnapshot(reqQuery, (snapshot) => {
        if (isInitial) {
          isInitial = false;
          return;
        }
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            playSound();
            const data = change.doc.data();
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Friend Request', {
                body: `${data.senderName || 'Someone'} sent you a friend request!`,
              });
            }
          }
        });
      });

      return () => {
        unsubReq();
      };
    });

    // Request browser notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => unsubAuth();
  }, []);

  return null;
}