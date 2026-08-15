'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDocs,
  where,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '@/firebase/firestore';
import { Send, User, Sparkles, MessageSquare, Users, UserPlus, CheckCircle2, Clock, Smile, PanelLeftClose, PanelLeftOpen, Bell, Paperclip, Image as ImageIcon, X, Phone, Video, PhoneOff } from 'lucide-react';

export default function DirectChatsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<{ uid: string; displayName: string } | null>(null);
  const [availablePeers, setAvailablePeers] = useState<any[]>([]);
  const [friendships, setFriendships] = useState<Record<string, string>>({});
  const [activePeer, setActivePeer] = useState<{ uid: string; displayName: string } | null>(null);

  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<{ type: 'image' | 'file'; url: string; name: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState<boolean>(false);
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState<boolean>(false);

  // Call states
  const [callActive, setCallActive] = useState<boolean>(false);
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ callerName: string; type: 'audio' | 'video' } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  
  // Ref storage for active call snapshot unsubscription handlers
  const callUnsubRef = useRef<(() => void) | null>(null);
  const candidatesUnsubRef = useRef<(() => void) | null>(null);

  const servers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const emojiCategories = {
    Smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😋', '😛'],
    Gestures: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚'],
    Hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
    Objects: ['💻', '📱', '⚡', '🔥', '✨', '💡', '🚀', '🎉', '🏆', '🎯', '📌', '📎', '🔑', '🔒', '🔔', '💬', '📢', '⭐', '🌟', '💥']
  };

  const playNotificationSound = () => {
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
      console.warn('Audio play blocked or unsupported:', err);
    }
  };

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  const handleRequestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermissionGranted(permission === 'granted');
      if (permission === 'granted') {
        new Notification('Notifications Enabled', {
          body: 'You will now receive alerts for incoming messages and friend requests.',
        });
      } else {
        alert('Notification permission was denied.');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userData = {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Peer Member',
        };
        setCurrentUser(userData);
        fetchPeersAndRelationships(user.uid);
      }
    });
    return () => unsub();
  }, []);

  // Listen for active incoming calls globally across conversations
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubConvs = onSnapshot(
      query(collection(db, 'conversations'), where('participantIds', 'array-contains', currentUser.uid)),
      (snapshot) => {
        snapshot.docs.forEach((convDoc) => {
          const convId = convDoc.id;
          const callRef = doc(db, 'conversations', convId, 'calls', 'active_call');

          onSnapshot(callRef, (callSnap) => {
            if (callSnap.exists()) {
              const callData = callSnap.data();
              if (callData.callerUid !== currentUser.uid && callData.status === 'ringing') {
                setConversationId(convId);
                setIncomingCall({
                  callerName: callData.callerName || 'Peer',
                  type: callData.type || 'audio',
                });
                playNotificationSound();
              }
            }
          });
        });
      }
    );

    return () => unsubConvs();
  }, [currentUser]);

  const fetchPeersAndRelationships = async (myUid: string) => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const peers: any[] = [];
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (docSnap.id !== myUid) {
          peers.push({
            uid: docSnap.id,
            displayName: data.displayName || data.email?.split('@')[0] || 'Peer Partner',
            email: data.email || '',
          });
        }
      });
      setAvailablePeers(peers);

      const friendsSnap = await getDocs(
        query(collection(db, 'friends'), where('users', 'array-contains', myUid))
      );
      const sentReqSnap = await getDocs(
        query(collection(db, 'friend_requests'), where('senderUid', '==', myUid))
      );
      const recvReqSnap = await getDocs(
        query(collection(db, 'friend_requests'), where('receiverUid', '==', myUid))
      );

      const statusMap: Record<string, string> = {};

      friendsSnap.forEach((d) => {
        const data = d.data();
        const otherUser = data.users.find((u: string) => u !== myUid);
        if (otherUser) statusMap[otherUser] = 'friends';
      });

      sentReqSnap.forEach((d) => {
        const data = d.data();
        statusMap[data.receiverUid] = 'pending_sent';
      });

      recvReqSnap.forEach((d) => {
        const data = d.data();
        statusMap[data.senderUid] = 'pending_received';
      });

      setFriendships(statusMap);

      const firstFriendUid = peers.find((p) => statusMap[p.uid] === 'friends')?.uid;
      if (firstFriendUid) {
        const friendObj = peers.find((p) => p.uid === firstFriendUid);
        setActivePeer(friendObj);
      }
    } catch (err) {
      console.error('Error fetching directory data:', err);
    }
  };

  const handleSendFriendRequest = async (targetPeer: any) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'friend_requests'), {
        senderUid: currentUser.uid,
        senderName: currentUser.displayName,
        receiverUid: targetPeer.uid,
        receiverName: targetPeer.displayName,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setFriendships((prev) => ({ ...prev, [targetPeer.uid]: 'pending_sent' }));
    } catch (err) {
      console.error('Failed to send friend request:', err);
    }
  };

  const handleAcceptRequest = async (senderUid: string, senderName: string) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'friends'), {
        users: [currentUser.uid, senderUid],
        createdAt: serverTimestamp(),
      });

      const q = query(
        collection(db, 'friend_requests'),
        where('senderUid', '==', senderUid),
        where('receiverUid', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      snap.forEach(async (d) => {
        await deleteDoc(doc(db, 'friend_requests', d.id));
      });

      setFriendships((prev) => ({ ...prev, [senderUid]: 'friends' }));
      const newlyAcceptedPeer = availablePeers.find((p) => p.uid === senderUid);
      if (newlyAcceptedPeer) {
        setActivePeer(newlyAcceptedPeer);
      }
    } catch (err) {
      console.error('Failed to accept friend request:', err);
    }
  };

  useEffect(() => {
    if (!currentUser?.uid || !activePeer?.uid) return;

    const sortedUids = [currentUser.uid, activePeer.uid].sort();
    const convId = `direct_${sortedUids[0]}_${sortedUids[1]}`;
    setConversationId(convId);

    const convRef = doc(db, 'conversations', convId);
    setDoc(
      convRef,
      {
        conversationId: convId,
        participantIds: sortedUids,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch((err) => console.warn('Conversation init non-fatal:', err));
  }, [currentUser, activePeer]);

  useEffect(() => {
    if (!conversationId || !currentUser?.uid) return;

    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    let isInitialMessagesLoad = true;

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (isInitialMessagesLoad) {
          isInitialMessagesLoad = false;
        } else {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              if (data.senderUid !== currentUser?.uid) {
                playNotificationSound();
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification(`New message from ${data.senderName || 'Peer'}`, {
                    body: data.text || 'Sent an attachment',
                  });
                }
              }
            }
          });
        }

        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setMessages(list);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      },
      (error) => {
        console.warn('Snapshot listener error:', error);
      }
    );

    return () => unsub();
  }, [conversationId, currentUser]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const isImage = file.type.startsWith('image/');
    
    reader.onload = (uploadEvent) => {
      setAttachment({
        type: isImage ? 'image' : 'file',
        url: uploadEvent.target?.result as string,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !attachment) || !conversationId || !currentUser) return;

    const currentText = text.trim();
    const currentAttachment = attachment;
    setText('');
    setAttachment(null);
    setShowEmojiPicker(false);

    await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
      conversationId,
      senderUid: currentUser.uid,
      senderName: currentUser.displayName,
      text: currentText,
      attachment: currentAttachment,
      createdAt: serverTimestamp(),
    });

    await setDoc(
      doc(db, 'conversations', conversationId),
      {
        lastMessage: currentText || (currentAttachment?.type === 'image' ? '📷 Image' : '📎 Attachment'),
        lastSenderUid: currentUser.uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const handleAddEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  const formatMessageTime = (createdAt: any) => {
    if (!createdAt) return 'Just now';
    const date = createdAt.seconds ? new Date(createdAt.seconds * 1000) : new Date(createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Start Call and Create WebRTC Offer with strict TypeScript compatibility
  const startCall = async (type: 'audio' | 'video') => {
    if (!conversationId || !currentUser) return;
    setCallType(type);
    setCallActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      
      if (!peerConnectionRef.current && callActive === false) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(servers);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      const callDocRef = doc(db, 'conversations', conversationId, 'calls', 'active_call');
      const iceCandidateQueue: RTCIceCandidateInit[] = [];

      pc.onicecandidate = async (event) => {
        if (event.candidate && peerConnectionRef.current) {
          try {
            await addDoc(collection(callDocRef, 'candidates'), event.candidate.toJSON());
          } catch (e) {
            console.warn('Failed to add candidate:', e);
          }
        }
      };

      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

      await setDoc(callDocRef, {
        callerUid: currentUser.uid,
        callerName: currentUser.displayName,
        offer: { type: offerDescription.type, sdp: offerDescription.sdp },
        type,
        status: 'ringing',
        createdAt: serverTimestamp(),
      });

      callUnsubRef.current = onSnapshot(callDocRef, async (snapshot) => {
        if (!peerConnectionRef.current) return;
        const data = snapshot.data();
        if (!pc.currentRemoteDescription && data?.answer) {
          try {
            const answerDescription = new RTCSessionDescription(data.answer);
            await pc.setRemoteDescription(answerDescription);

            while (iceCandidateQueue.length > 0) {
              const queuedCandidate = iceCandidateQueue.shift();
              if (queuedCandidate && pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(queuedCandidate));
              }
            }
          } catch (e) {
            console.warn('Error setting remote description or flushing candidates:', e);
          }
        }
      });

      candidatesUnsubRef.current = onSnapshot(collection(callDocRef, 'candidates'), async (snapshot) => {
        if (!peerConnectionRef.current) return;
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const candidateData = change.doc.data();
            try {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(candidateData));
              } else {
                iceCandidateQueue.push(candidateData);
              }
            } catch (e) {
              console.warn('Error adding ice candidate:', e);
            }
          }
        });
      });
    } catch (err) {
      console.error('Call initialization error:', err);
      alert('Could not start media stream or access device permissions.');
      endCall();
    }
  };

  // Accept Incoming Call with strict TypeScript compatibility
  const acceptCall = async () => {
    if (!conversationId || !currentUser) return;
    setIncomingCall(null);
    setCallActive(true);

    try {
      const callDocRef = doc(db, 'conversations', conversationId, 'calls', 'active_call');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall?.type === 'video',
      });

      localStreamRef.current = stream;
      if (localVideoRef.current && incomingCall?.type === 'video') {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(servers);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      const iceCandidateQueue: RTCIceCandidateInit[] = [];

      pc.onicecandidate = async (event) => {
        if (event.candidate && peerConnectionRef.current) {
          try {
            await addDoc(collection(callDocRef, 'candidates'), event.candidate.toJSON());
          } catch (e) {
            console.warn('Failed to add candidate:', e);
          }
        }
      };

      callUnsubRef.current = onSnapshot(callDocRef, async (snapshot) => {
        if (!peerConnectionRef.current) return;
        const data = snapshot.data();
        if (data?.offer && !pc.currentRemoteDescription) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);

            await updateDoc(callDocRef, {
              answer: { type: answerDescription.type, sdp: answerDescription.sdp },
              status: 'connected',
            });

            while (iceCandidateQueue.length > 0) {
              const queuedCandidate = iceCandidateQueue.shift();
              if (queuedCandidate && pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(queuedCandidate));
              }
            }
          } catch (e) {
            console.warn('Error handling offer/answer setup:', e);
          }
        }
      });

      candidatesUnsubRef.current = onSnapshot(collection(callDocRef, 'candidates'), async (snapshot) => {
        if (!peerConnectionRef.current) return;
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const candidateData = change.doc.data();
            try {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(candidateData));
              } else {
                iceCandidateQueue.push(candidateData);
              }
            } catch (e) {
              console.warn('Error adding ice candidate:', e);
            }
          }
        });
      });
    } catch (err) {
      console.error('Failed to accept call:', err);
      endCall();
    }
  };

  // Reject Incoming Call
  const rejectCall = async () => {
    setIncomingCall(null);
    if (conversationId) {
      try {
        await deleteDoc(doc(db, 'conversations', conversationId, 'calls', 'active_call'));
      } catch (err) {
        console.warn('Call cleanup error:', err);
      }
    }
  };

  // End Call & Cleanup
  const endCall = async () => {
    if (callUnsubRef.current) {
      callUnsubRef.current();
      callUnsubRef.current = null;
    }
    if (candidatesUnsubRef.current) {
      candidatesUnsubRef.current();
      candidatesUnsubRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {
        console.warn('Error closing peer connection:', e);
      }
      peerConnectionRef.current = null;
    }
    setCallActive(false);
    setIncomingCall(null);
    setCallType(null);

    if (conversationId) {
      try {
        await deleteDoc(doc(db, 'conversations', conversationId, 'calls', 'active_call'));
      } catch (err) {
        console.warn('Call doc cleanup error:', err);
      }
    }
  };

  return (
    <main className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* INCOMING CALL MODAL POPUP */}
      {incomingCall && (
        <div className="absolute inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center p-6 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-24 h-24 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-3xl font-bold text-indigo-300 mx-auto animate-bounce">
              {incomingCall.callerName.slice(0, 2).toUpperCase()}
            </div>
            <h3 className="text-xl font-extrabold text-white">
              Incoming {incomingCall.type === 'video' ? 'Video' : 'Audio'} Call
            </h3>
            <p className="text-sm text-slate-300">
              <span className="font-bold text-indigo-400">{incomingCall.callerName}</span> is calling you...
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={rejectCall}
              className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-rose-600/30"
            >
              <PhoneOff className="w-4 h-4" /> Reject
            </button>
            <button
              onClick={acceptCall}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-600/30"
            >
              <Phone className="w-4 h-4" /> Accept
            </button>
          </div>
        </div>
      )}

      {/* PEERS LIST SIDEBAR */}
      <aside
        className={`border-r border-slate-800 bg-slate-900 flex flex-col flex-shrink-0 transition-all duration-300 ${
          isSidebarMinimized ? 'w-20' : 'w-80'
        }`}
      >
        <div className="p-4 border-b border-slate-800 font-bold text-sm text-white flex items-center justify-between">
          {!isSidebarMinimized && (
            <span className="flex items-center gap-2 truncate">
              <MessageSquare className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              Direct Chats
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsSidebarMinimized((prev) => !prev)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition mx-auto"
            title={isSidebarMinimized ? 'Expand Directory' : 'Minimize Directory'}
          >
            {isSidebarMinimized ? <PanelLeftOpen className="w-4 h-4 text-indigo-400" /> : <PanelLeftClose className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>

        {!isSidebarMinimized && !notificationPermissionGranted && (
          <div className="p-3 m-3 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl flex items-center justify-between gap-2">
            <div className="truncate">
              <h5 className="text-[11px] font-bold text-white flex items-center gap-1">
                <Bell className="w-3 h-3 text-indigo-400" /> Enable Alerts
              </h5>
              <p className="text-[10px] text-slate-400 truncate">Get push alerts for messages</p>
            </div>
            <button
              onClick={handleRequestNotificationPermission}
              className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition shadow flex-shrink-0"
            >
              Allow
            </button>
          </div>
        )}

        <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
          {availablePeers.length === 0 ? (
            !isSidebarMinimized && (
              <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                <Users className="w-6 h-6 mx-auto text-slate-700 mb-2" />
                <p>No other peers found.</p>
              </div>
            )
          ) : (
            availablePeers.map((peer) => {
              const relation = friendships[peer.uid] || 'none';
              const isSelected = activePeer?.uid === peer.uid;
              const initials = peer.displayName ? peer.displayName.slice(0, 2).toUpperCase() : 'P';

              if (isSidebarMinimized) {
                return (
                  <div
                    key={peer.uid}
                    onClick={() => {
                      if (relation === 'friends') {
                        setActivePeer(peer);
                      }
                    }}
                    title={peer.displayName}
                    className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center font-bold text-xs transition cursor-pointer relative ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : relation === 'friends'
                        ? 'bg-slate-800 hover:bg-slate-700 text-indigo-300'
                        : 'bg-slate-950/40 text-slate-500 opacity-60'
                    }`}
                  >
                    {initials}
                    {relation === 'pending_received' && (
                      <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-amber-400 ring-2 ring-slate-900" />
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={peer.uid}
                  onClick={() => {
                    if (relation === 'friends') {
                      setActivePeer(peer);
                    }
                  }}
                  className={`p-3 rounded-2xl flex items-center justify-between gap-2 transition ${
                    isSelected
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                      : relation === 'friends'
                      ? 'bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer text-slate-300'
                      : 'bg-slate-950/30 border border-slate-800/50 text-slate-400 opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-xs flex-shrink-0">
                      {initials}
                    </div>
                    <div className="truncate min-w-0">
                      <h4 className="text-xs font-bold truncate">{peer.displayName}</h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {relation === 'friends'
                          ? 'Connected Friend'
                          : relation === 'pending_sent'
                          ? 'Request Pending'
                          : relation === 'pending_received'
                          ? 'Wants to connect'
                          : 'Not connected'}
                      </p>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {relation === 'friends' ? (
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Chat
                      </span>
                    ) : relation === 'pending_sent' ? (
                      <span className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Sent
                      </span>
                    ) : relation === 'pending_received' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptRequest(peer.uid, peer.displayName);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition shadow"
                      >
                        Accept
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendFriendRequest(peer);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 transition shadow"
                      >
                        <UserPlus className="w-3 h-3" /> Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* CHAT WINDOW */}
      <section className="flex-1 flex flex-col bg-slate-950 min-w-0 relative">
        {activePeer ? (
          <>
            <header className="p-4 border-b border-slate-800 bg-slate-900 font-bold text-sm text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-white">{activePeer.displayName}</span>
                  <span className="block text-[10px] text-emerald-400 font-normal flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span> Active Direct Message
                  </span>
                </div>
              </div>

              {/* CALL ACTIONS */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startCall('audio')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 transition"
                  title="Start Audio Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => startCall('video')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 transition"
                  title="Start Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* CALL OVERLAY MODAL */}
            {callActive && (
              <div className="absolute inset-0 bg-slate-950/95 z-30 flex flex-col items-center justify-center p-6 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-2xl font-bold text-indigo-300 mx-auto animate-pulse">
                    {activePeer.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {callType === 'video' ? 'Video Call with' : 'Audio Call with'} {activePeer.displayName}
                  </h3>
                  <p className="text-xs text-emerald-400 font-medium">Connected • Secure Stream</p>
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
                    onClick={endCall}
                    className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-rose-600/30"
                  >
                    <PhoneOff className="w-4 h-4" /> End Call
                  </button>
                </div>
              </div>
            )}

            {/* MESSAGES FEED */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
                  <MessageSquare className="w-8 h-8 text-slate-700" />
                  <p className="text-xs">No messages yet with {activePeer.displayName}. Say hello!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderUid === currentUser?.uid;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-slate-500 mb-1 px-1">
                        {isMe ? 'You' : m.senderName || 'Peer'} • {formatMessageTime(m.createdAt)}
                      </span>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm space-y-2 leading-relaxed ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                        }`}
                      >
                        {m.attachment && (
                          <div className="rounded-xl overflow-hidden max-w-xs">
                            {m.attachment.type === 'image' ? (
                              <img src={m.attachment.url} alt="Uploaded attachment" className="w-full object-cover rounded-xl max-h-48" />
                            ) : (
                              <a
                                href={m.attachment.url}
                                download={m.attachment.name}
                                className="flex items-center gap-2 p-2.5 bg-slate-950/60 rounded-xl text-xs font-semibold hover:bg-slate-950 transition"
                              >
                                <Paperclip className="w-4 h-4 text-indigo-400" />
                                <span className="truncate">{m.attachment.name}</span>
                              </a>
                            )}
                          </div>
                        )}
                        {m.text && <p>{m.text}</p>}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* FULL EMOJI PICKER POPUP */}
            {showEmojiPicker && (
              <div className="absolute bottom-20 left-4 w-80 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl z-20 space-y-3 max-h-72 overflow-y-auto">
                {Object.entries(emojiCategories).map(([category, list]) => (
                  <div key={category}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{category}</p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {list.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddEmoji(emoji)}
                          className="w-9 h-9 rounded-xl bg-slate-950 hover:bg-indigo-600/30 flex items-center justify-center text-lg transition"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ATTACHMENT PREVIEW BAR */}
            {attachment && (
              <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  {attachment.type === 'image' ? (
                    <img src={attachment.url} alt="Preview" className="w-10 h-10 object-cover rounded-lg" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Paperclip className="w-5 h-5" />
                    </div>
                  )}
                  <span className="text-xs text-slate-200 truncate">{attachment.name}</span>
                </div>
                <button
                  onClick={() => setAttachment(null)}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* COMPOSER */}
            <footer className="p-3 bg-slate-900 border-t border-slate-800 relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 max-w-4xl mx-auto"
              >
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Insert Emoji"
                >
                  <Smile className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Attach File or Image"
                >
                  <Paperclip className="w-4 h-4 text-indigo-400" />
                </button>

                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Message ${activePeer.displayName}...`}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs p-6 space-y-2">
            <Users className="w-10 h-10 text-slate-700 mb-1" />
            <p className="font-bold text-white text-sm">Select an Accepted Friend</p>
            <p className="max-w-xs text-slate-400">
              Direct messages require an accepted friend connection. Send or accept a request from the sidebar directory to chat.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}