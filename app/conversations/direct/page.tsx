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
  getDoc,
  where,
  deleteDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { db } from '@/firebase/firestore';
import { Send, User, MessageSquare, Users, UserPlus, CheckCircle2, Check, Clock, Smile, PanelLeftClose, PanelLeftOpen, Bell, Paperclip, X, Phone, Video, PhoneOff } from 'lucide-react';

import { callService } from '@/features/chat/services/callService';
import { conversationService } from '@/features/chat/services/conversationService';
import { callHistoryService } from '@/features/chat/services/callHistoryService';
import { friendService } from '@/features/chat/services/friendService';
import { notificationService } from '@/features/notifications/services/notificationService';
import { incomingCallService, IncomingCallNotification } from '@/features/chat/services/incomingCallService';

import { IncomingCallBanner } from '@/features/chat/components/IncomingCallBanner';
import { ActiveCall } from '@/features/chat/components/ActiveCall';
import { CallHistory } from '@/features/chat/components/CallHistory';

const storage = getStorage();

export default function DirectChatsPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<{ uid: string; displayName: string } | null>(null);
  const [availablePeers, setAvailablePeers] = useState<any[]>([]);
  const [friendships, setFriendships] = useState<Record<string, string>>({});
  const [activePeer, setActivePeer] = useState<{ uid: string; displayName: string } | null>(null);

  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  
  // Typing indicators & Read receipt states
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<any>(null);
  
  // File preview states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [emojiCategory, setEmojiCategory] = useState<'smileys' | 'animals' | 'food' | 'activities' | 'travel' | 'objects' | 'symbols'>('smileys');

  const emojiCategories = {
    smileys: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','😢','😭','😱','😖','😣','😤','😡','🤬','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾'],
    animals: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦢','🦉','🦅','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔'],
    food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🌽','🥕','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🥪','🥙','🧆','🌮','🌯','🥗','🥘','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥠','🥮','🍢','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🍼','☕','🍵','🧃','🥤','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🥄','🍴','🍽️','🥣','🥡','🥢','🧂'],
    activities: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🥌','🏂','🪂','🏋️‍♀️','🏋️‍♂️','🤼‍♀️','🤼‍♂️','🤸‍♀️','🤸‍♂️','⛹️‍♀️','⛹️‍♂️','🤺','🤾‍♀️','🤾‍♂️','🏌️‍♀️','🏌️‍♂️','🏇','🧘‍♀️','🧘‍♂️','🏄‍♀️','🏄‍♂️','🏊‍♀️','🏊‍♂️','🤽‍♀️','🤽‍♂️','🚣‍♀️','🚣‍♂️','🧗‍♀️','🧗‍♂️','🚵‍♀️','🚵‍♂️','🚴‍♀️','🚴‍♂️','🏆','🥇','🥈','🥉','🏅','🎖️','🎫','🎟️','🎪','🤹‍♀️','🤹‍♂️','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🎷','🎺','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🎰','🧩'],
    travel: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛺','🦽','🦼','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚄','🚅','🚆','🚇','🚂','🚝','🚞','🚏','🛤️','⛽','🔌','🚥','🚦','🚧','⚓','⛵','🚤','🛳️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚁','🛰️','🚀','🛸','🛎️','⌛','⏳','⏰','⏱️','⏲️','🕰️','🕛','🕧','🕐','🕜','🕑','🕝','🕒','🕞','🕓','🕟','🕔','🕠','🕕','🕡','🕖','🕢','🕗','🕣','🕘','🕤','🕙','🕥','🕚','🕦'],
    objects: ['⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🛠️','🔨','⚙️','🔗','⛓️','🪝','🧲','⚗️','🧪','🧫','🧬','🔬','🔭','💉','🩸','💊','🩹','🩺','🚪','🛏️','🛋️','🚽','🚿','🛁','🪒','🧽','🧴','🧻','🧹','🧺','🧷'],
    symbols: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🈳','🈹','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','🔴','🟠','🟡','🟢','🔵','🟣','🟤','🔶','🔷','🔸','🔹','🔺','🔻','💠','🔘','🔲','🔳','💯','💢','💬','👁️‍🗨️','🗨️','🗯️','💭','💤']
  };

  const [isSidebarMinimized, setIsSidebarMinimized] = useState<boolean>(false);
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState<boolean>(false);

  // Call states
  const [callActive, setCallActive] = useState<boolean>(false);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected'>('ringing');
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ callerName: string; type: 'audio' | 'video'; conversationId: string; callId: string; callerUid?: string } | null>(null);
  const [callHistory, setCallHistory] = useState<any[]>([]);
  const [showCallHistory, setShowCallHistory] = useState<boolean>(true);
  
  const incomingCallConversationRef = useRef<string | null>(null);
  const activeCallIdRef = useRef<string | null>(null);
  const callActiveRef = useRef(false);
  const incomingCallRef = useRef<any | null>(null);
  const callPeerNameRef = useRef<string | null>(null);
  const callDirectionRef = useRef<'outgoing' | 'incoming' | null>(null);
  const callHistorySavedRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  
  const ringtoneIntervalRef = useRef<any>(null);

  const startRingtone = () => {
    stopRingtone();
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      ringtoneIntervalRef.current = setInterval(() => {
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(480, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }, 2000);
    } catch (err) {
      console.warn('Ringtone error:', err);
    }
  };

  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  const handleRegisterNotifications = async () => {
    if (!currentUser) return;
    await notificationService.registerDeviceToken(currentUser.uid);
    setNotificationPermissionGranted(true);
  };

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Peer Member',
        });
        fetchPeersAndRelationships(user.uid);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    callActiveRef.current = callActive;
  }, [callActive]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  // Global realtime incoming call listener using user incomingCalls inbox
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = incomingCallService.subscribeToIncomingCalls(currentUser.uid, (calls) => {
      if (calls.length > 0) {
        const latestCall = calls[0];
        incomingCallConversationRef.current = latestCall.conversationId;
        activeCallIdRef.current = latestCall.callId;

        setIncomingCall((prev) => {
          if (prev) return prev;
          startRingtone();
          notificationService.showNotification(
            `Incoming ${latestCall.type === 'video' ? 'Video' : 'Audio'} Call`,
            `${latestCall.callerName || 'Peer'} is calling you...`
          );
          return {
            callerName: latestCall.callerName || 'Peer',
            type: latestCall.type || 'audio',
            conversationId: latestCall.conversationId,
            callId: latestCall.callId,
            callerUid: latestCall.callerUid,
          };
        });
      } else {
        if (incomingCallRef.current && !callActiveRef.current) {
          stopRingtone();
          setIncomingCall(null);
          incomingCallConversationRef.current = null;
          activeCallIdRef.current = null;
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

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
          });
        }
      });
      setAvailablePeers(peers);

      friendService.subscribeToFriends(myUid, (friendUids) => {
        const statusMap: Record<string, string> = {};
        friendUids.forEach((uid) => { statusMap[uid] = 'friends'; });
        setFriendships(statusMap);
        const firstFriend = peers.find((p) => statusMap[p.uid] === 'friends');
        if (firstFriend && !activePeer) setActivePeer(firstFriend);
      });
    } catch (err) {
      console.error('Directory fetch error:', err);
    }
  };

  const handleSendFriendRequest = async (peer: any) => {
    if (!currentUser) return;
    try {
      await friendService.sendFriendRequest(currentUser.uid, currentUser.displayName, peer.uid, peer.displayName);
      setFriendships((prev) => ({ ...prev, [peer.uid]: 'pending_sent' }));
    } catch (err) {
      console.error('Failed to send request:', err);
    }
  };

  // Ensure conversation document exists before loading chat or call subcollections
  useEffect(() => {
    if (!currentUser?.uid || !activePeer?.uid) return;

    const sortedUids = [currentUser.uid, activePeer.uid].sort();
    const convId = sortedUids.join('_');

    let isMounted = true;
    const initConversation = async () => {
      const ref = doc(db, 'conversations', convId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          participantIds: sortedUids,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      if (isMounted) {
        setConversationId(convId);
      }
    };

    initConversation().catch((err) => console.error('Error initializing conversation:', err));

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, activePeer?.uid]);

  // Subscribe to Messages and mark unread incoming messages as 'read'
  useEffect(() => {
    if (!conversationId || !currentUser?.uid) return;
    return conversationService.subscribeToMessages(conversationId, async (list) => {
      setMessages(list);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

      // Check for unread messages sent by the peer and update their status to 'read'
      const unreadDocs: any[] = [];
      list.forEach((m) => {
        if (m.senderUid !== currentUser.uid && m.status !== 'read') {
          unreadDocs.push(m.id);
        }
      });

      if (unreadDocs.length > 0) {
        try {
          const batch = writeBatch(db);
          unreadDocs.forEach((msgId) => {
            const msgRef = doc(db, 'conversations', conversationId, 'messages', msgId);
            batch.update(msgRef, { status: 'read' });
          });
          await batch.commit();
        } catch (err) {
          console.error('Failed to mark read receipts:', err);
        }
      }
    });
  }, [conversationId, currentUser?.uid]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!conversationId || !currentUser?.uid) return;
    const typingColRef = collection(db, 'conversations', conversationId, 'typing');
    const unsubTyping = onSnapshot(typingColRef, (snapshot) => {
      const activeTyping: string[] = [];
      snapshot.forEach((docSnap) => {
        if (docSnap.id !== currentUser.uid) {
          activeTyping.push(docSnap.data().displayName);
        }
      });
      setTypingUsers(activeTyping);
    });
    return () => unsubTyping();
  }, [conversationId, currentUser?.uid]);

  useEffect(() => {
    if (!conversationId) return;
    return callHistoryService.subscribeToCallHistory(conversationId, (records) => {
      setCallHistory(records);
    });
  }, [conversationId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { 
      alert('File size exceeds 15 MB limit.'); 
      return; 
    }
    setSelectedFile(file);
    e.target.value = '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    if (!conversationId || !currentUser) return;

    // Set typing status to true
    const typingRef = doc(db, 'conversations', conversationId, 'typing', currentUser.uid);
    setDoc(typingRef, { displayName: currentUser.displayName, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});

    // Clear previous timeout and set new one to turn off typing after 2 seconds of inactivity
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await deleteDoc(typingRef);
      } catch (err) {}
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !selectedFile) || !conversationId || !currentUser || isUploading) return;

    const currentText = text.trim();
    const fileToSend = selectedFile;

    // Reset inputs immediately & clear typing indicator instantly
    setText('');
    setSelectedFile(null);
    setIsUploading(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    try {
      const typingRef = doc(db, 'conversations', conversationId, 'typing', currentUser.uid);
      await deleteDoc(typingRef);
    } catch (err) {}

    try {
      let attachmentPayload = null;

      if (fileToSend) {
        const safeName = fileToSend.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileRef = storageRef(storage, `chat_attachments/${conversationId}/${currentUser.uid}/${Date.now()}_${safeName}`);
        const snap = await uploadBytes(fileRef, fileToSend);
        const url = await getDownloadURL(snap.ref);

        attachmentPayload = {
          type: fileToSend.type.startsWith('image/') ? ('image' as const) : ('file' as const),
          url: url,
          name: fileToSend.name,
          size: fileToSend.size,
          contentType: fileToSend.type || 'application/octet-stream',
        };
      }

      await conversationService.sendMessage({
        conversationId,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName,
        text: currentText,
        attachment: attachmentPayload || undefined,
      });
    } catch (err) {
      console.error('Failed to send message or upload file:', err);
      alert('Failed to send file attachment. Please try again.');
      if (fileToSend) setSelectedFile(fileToSend);
      if (currentText) setText(currentText);
    } finally {
      setIsUploading(false);
    }
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!conversationId || !currentUser || !activePeer) return;
    callPeerNameRef.current = activePeer.displayName;
    callDirectionRef.current = 'outgoing';
    callHistorySavedRef.current = false;
    setCallType(type);
    setCallActive(true);
    setCallStatus('ringing');
    startRingtone();

    try {
      await callService.clearStaleCandidates(conversationId);

      const localStream = await callService.startCall({
        conversationId,
        currentUserUid: currentUser.uid,
        currentUserName: currentUser.displayName,
        peerUid: activePeer.uid,
        type,
        onRemoteStream: (remoteStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(e => console.warn('Audio play:', e));
          }
        },
        onCallConnected: () => {
          setCallStatus('connected');
          stopRingtone();
        },
        onCallEnded: () => endCall(),
      });

      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = localStream;
      }

      const pc = callService.createPeerConnection(
        (remoteStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(() => {});
          }
        },
        (state) => {
          if (state === 'connected') {
            setCallStatus('connected');
            stopRingtone();
          } else if (state === 'failed' || state === 'disconnected') {
            endCall();
          }
        }
      );

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      const candidateQueue: RTCIceCandidateInit[] = [];

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(
            collection(db, 'conversations', conversationId, 'calls', 'active_call', 'candidates'),
            {
              candidate: event.candidate.toJSON(),
              senderUid: currentUser.uid,
              createdAt: serverTimestamp(),
            }
          );
        }
      };

      const candidatesRef = collection(db, 'conversations', conversationId, 'calls', 'active_call', 'candidates');
      onSnapshot(candidatesRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.senderUid !== currentUser.uid && data.candidate) {
              const iceCandidate = new RTCIceCandidate(data.candidate);
              if (pc.remoteDescription && pc.remoteDescription.type) {
                try {
                  await pc.addIceCandidate(iceCandidate);
                } catch (e) {
                  console.warn('Error adding received ice candidate', e);
                }
              } else {
                candidateQueue.push(data.candidate);
              }
            }
          }
        });
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await callService.createCall({
        conversationId,
        callerUid: currentUser.uid,
        receiverUid: activePeer.uid,
        type,
        offer,
      });

      await incomingCallService.sendIncomingCall({
        receiverUid: activePeer.uid,
        callId: conversationId,
        conversationId,
        callerUid: currentUser.uid,
        callerName: currentUser.displayName,
        type,
        offer,
      });

      const activeCallRef = doc(db, 'conversations', conversationId, 'calls', 'active_call');
      const unsubscribeActiveCall = onSnapshot(activeCallRef, async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'ended') {
            stopRingtone();
            callService.cleanup();
            setCallActive(false);
            setIncomingCall(null);
            setCallType(null);
            incomingCallConversationRef.current = null;
            activeCallIdRef.current = null;
            return;
          }

          if (data.status === 'connected') {
            setCallStatus('connected');
            stopRingtone();

            if (data.answer && pc.signalingState === 'have-local-offer') {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                
                while (candidateQueue.length > 0) {
                  const queuedCandidate = candidateQueue.shift();
                  if (queuedCandidate) {
                    try {
                      await pc.addIceCandidate(new RTCIceCandidate(queuedCandidate));
                    } catch (e) {
                      console.warn('Error adding queued ice candidate', e);
                    }
                  }
                }
              } catch (e) {
                console.warn('Failed to set remote answer description:', e);
              }
            }

            if (!callHistorySavedRef.current) {
              callHistorySavedRef.current = true;
              callHistoryService.logCall({
                conversationId,
                callerUid: currentUser.uid,
                callerName: currentUser.displayName,
                receiverUid: activePeer.uid,
                type,
                direction: 'outgoing',
                status: 'accepted',
              });
            }
          }
        } else {
          if (callActiveRef.current) {
            endCall();
          }
        }
      });
    } catch (err) {
      console.error('Start call error:', err);
      endCall();
    }
  };

  const acceptCall = async () => {
    stopRingtone();
    const incomingConvId = incomingCallConversationRef.current;
    const callId = activeCallIdRef.current;
    if (!incomingConvId || !currentUser || !incomingCall) return;

    if (callId) {
      await incomingCallService.clearIncomingCall(currentUser.uid, callId);
    }

    const acceptedType = incomingCall.type;
    callDirectionRef.current = 'incoming';
    callHistorySavedRef.current = false;
    setConversationId(incomingConvId);
    setIncomingCall(null);
    setCallActive(true);
    setCallStatus('connected');
    setCallType(acceptedType);

    try {
      const localStream = await callService.answerCall({
        conversationId: incomingConvId,
        currentUserUid: currentUser.uid,
        currentUserName: currentUser.displayName,
        peerUid: '',
        type: acceptedType,
        onRemoteStream: (remoteStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(e => console.warn('Audio play:', e));
          }
        },
        onCallConnected: () => setCallStatus('connected'),
        onCallEnded: () => endCall(),
      });

      if (localVideoRef.current && acceptedType === 'video') {
        localVideoRef.current.srcObject = localStream;
      }

      const pc = callService.createPeerConnection(
        (remoteStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(() => {});
          }
        },
        (state) => {
          if (state === 'connected') {
            setCallStatus('connected');
          } else if (state === 'failed' || state === 'disconnected') {
            endCall();
          }
        }
      );

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      const candidateQueue: RTCIceCandidateInit[] = [];

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await addDoc(
            collection(db, 'conversations', incomingConvId, 'calls', 'active_call', 'candidates'),
            {
              candidate: event.candidate.toJSON(),
              senderUid: currentUser.uid,
              createdAt: serverTimestamp(),
            }
          );
        }
      };

      const candidatesRef = collection(db, 'conversations', incomingConvId, 'calls', 'active_call', 'candidates');
      onSnapshot(candidatesRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.senderUid !== currentUser.uid && data.candidate) {
              const iceCandidate = new RTCIceCandidate(data.candidate);
              if (pc.remoteDescription && pc.remoteDescription.type) {
                try {
                  await pc.addIceCandidate(iceCandidate);
                } catch (e) {
                  console.warn('Error adding received ice candidate', e);
                }
              } else {
                candidateQueue.push(data.candidate);
              }
            }
          }
        });
      });

      const activeCallRef = doc(db, 'conversations', incomingConvId, 'calls', 'active_call');
      const activeCallSnap = await getDoc(activeCallRef);

      if (activeCallSnap.exists() && activeCallSnap.data().offer) {
        const offer = activeCallSnap.data().offer;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        while (candidateQueue.length > 0) {
          const queuedCandidate = candidateQueue.shift();
          if (queuedCandidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(queuedCandidate));
            } catch (e) {
              console.warn('Error adding queued ice candidate', e);
            }
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await callService.acceptCall(incomingConvId, answer);
      }

      onSnapshot(activeCallRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'ended') {
            stopRingtone();
            callService.cleanup();
            setCallActive(false);
            setIncomingCall(null);
            setCallType(null);
            incomingCallConversationRef.current = null;
            activeCallIdRef.current = null;
          }
        } else {
          if (callActiveRef.current) {
            endCall();
          }
        }
      });

      if (!callHistorySavedRef.current) {
        callHistorySavedRef.current = true;
        callHistoryService.logCall({
          conversationId: incomingConvId,
          callerUid: incomingCall.callerUid || '',
          callerName: incomingCall.callerName,
          receiverUid: currentUser.uid,
          type: acceptedType,
          direction: 'incoming',
          status: 'accepted',
        });
      }
    } catch (err) {
      console.error('Accept call error:', err);
      endCall();
    }
  };

  const rejectCall = async () => {
    stopRingtone();
    if (incomingCall && incomingCallConversationRef.current && currentUser) {
      callHistoryService.logCall({
        conversationId: incomingCallConversationRef.current,
        callerUid: '',
        callerName: incomingCall.callerName,
        receiverUid: currentUser.uid,
        type: incomingCall.type,
        direction: 'incoming',
        status: 'rejected',
      });
    }
    const convId = incomingCallConversationRef.current;
    const callId = activeCallIdRef.current;
    if (currentUser && callId) {
      await incomingCallService.clearIncomingCall(currentUser.uid, callId);
    }
    setIncomingCall(null);
    incomingCallConversationRef.current = null;
    activeCallIdRef.current = null;
    if (convId) await callService.terminateCall(convId);
  };

  const endCall = async () => {
    stopRingtone();
    const convId = incomingCallConversationRef.current || conversationId;
    if (convId && currentUser && callDirectionRef.current && !callHistorySavedRef.current) {
      callHistoryService.logCall({
        conversationId: convId,
        callerUid: currentUser.uid,
        callerName: currentUser.displayName,
        receiverUid: activePeer?.uid || '',
        type: callType || 'audio',
        direction: callDirectionRef.current,
        status: callDirectionRef.current === 'incoming' ? 'missed' : 'cancelled',
      });
      callHistorySavedRef.current = true;
    }
    if (currentUser && activeCallIdRef.current) {
      await incomingCallService.clearIncomingCall(currentUser.uid, activeCallIdRef.current);
    }

    if (convId) {
      try {
        const activeCallRef = doc(db, 'conversations', convId, 'calls', 'active_call');
        await updateDoc(activeCallRef, { status: 'ended', endedBy: currentUser?.uid });
      } catch (err) {
        // Document might already be cleared or deleted
      }
      await callService.terminateCall(convId);
    }

    callService.cleanup();
    setCallActive(false);
    setIncomingCall(null);
    setCallType(null);
    incomingCallConversationRef.current = null;
    activeCallIdRef.current = null;
  };

  return (
    <main className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      <audio ref={remoteAudioRef} autoPlay playsInline controls={false} className="hidden" />

      {incomingCall && !callActive && (
        <IncomingCallBanner
          callerName={incomingCall.callerName}
          type={incomingCall.type}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {/* SIDEBAR DIRECTORY */}
      <aside className={`border-r border-slate-800 bg-slate-900 flex flex-col flex-shrink-0 transition-all duration-300 ${isSidebarMinimized ? 'w-20' : 'w-80'}`}>
        <div className="p-4 border-b border-slate-800 font-bold text-sm text-white flex items-center justify-between">
          {!isSidebarMinimized && (
            <span className="flex items-center gap-2 truncate">
              <MessageSquare className="w-4 h-4 text-indigo-400 flex-shrink-0" /> Direct Chats
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsSidebarMinimized((prev) => !prev)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition mx-auto"
            title={isSidebarMinimized ? 'Expand Sidebar' : 'Minimize Sidebar'}
          >
            {isSidebarMinimized ? <PanelLeftOpen className="w-4 h-4 text-indigo-400" /> : <PanelLeftClose className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>

        {!isSidebarMinimized && !notificationPermissionGranted && (
          <div className="p-3 m-3 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl flex items-center justify-between gap-2">
            <div className="truncate">
              <h5 className="text-[11px] font-bold text-white flex items-center gap-1"><Bell className="w-3 h-3 text-indigo-400" /> Enable Alerts</h5>
              <p className="text-[10px] text-slate-400 truncate">Get push alerts for incoming calls</p>
            </div>
            <button onClick={handleRegisterNotifications} className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition">Allow</button>
          </div>
        )}

        <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
          {availablePeers.map((peer) => {
            const relation = friendships[peer.uid] || 'none';
            const isSelected = activePeer?.uid === peer.uid;
            const initials = peer.displayName ? peer.displayName.slice(0, 2).toUpperCase() : 'P';

            if (isSidebarMinimized) {
              return (
                <div
                  key={peer.uid}
                  onClick={() => relation === 'friends' && setActivePeer(peer)}
                  title={peer.displayName}
                  className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center font-bold text-xs transition cursor-pointer ${
                    isSelected ? 'bg-indigo-600 text-white shadow-lg' : relation === 'friends' ? 'bg-slate-800 text-indigo-300' : 'bg-slate-950/40 text-slate-500 opacity-60'
                  }`}
                >
                  {initials}
                </div>
              );
            }

            return (
              <div
                key={peer.uid}
                onClick={() => relation === 'friends' && setActivePeer(peer)}
                className={`p-3 rounded-2xl flex items-center justify-between gap-2 transition ${
                  isSelected ? 'bg-indigo-600/20 border border-indigo-500/40 text-white' : relation === 'friends' ? 'bg-slate-950/60 border border-slate-800 cursor-pointer text-slate-300' : 'bg-slate-950/30 border border-slate-800/50 text-slate-400 opacity-80'
                }`}
              >
                <div className="flex items-center gap-3 truncate min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-xs flex-shrink-0">
                    {initials}
                  </div>
                  <div className="truncate min-w-0">
                    <h4 className="text-xs font-bold truncate">{peer.displayName}</h4>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{relation === 'friends' ? 'Connected Friend' : 'Not connected'}</p>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {relation === 'friends' ? (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Chat
                    </span>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSendFriendRequest(peer); }}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      <UserPlus className="w-3 h-3" /> Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* MAIN CHAT WINDOW */}
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

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => startCall('audio')} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 transition" title="Start Audio Call">
                  <Phone className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => startCall('video')} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 transition" title="Start Video Call">
                  <Video className="w-4 h-4" />
                </button>
              </div>
            </header>

            {callActive && (
              <ActiveCall
                peerName={activePeer.displayName}
                callType={callType}
                callStatus={callStatus}
                localVideoRef={localVideoRef}
                remoteVideoRef={remoteVideoRef}
                onEndCall={endCall}
              />
            )}

            {showCallHistory && callHistory.length > 0 && (
              <CallHistory history={callHistory} onHide={() => setShowCallHistory(false)} />
            )}

            {!showCallHistory && callHistory.length > 0 && (
              <button type="button" onClick={() => setShowCallHistory(true)} className="mx-4 mt-3 self-start rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-[10px] font-bold text-indigo-400 hover:bg-slate-800 transition">
                📞 Show call history ({callHistory.length})
              </button>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500">
                  <MessageSquare className="w-8 h-8 text-slate-700" />
                  <p className="text-xs">No messages yet with {activePeer.displayName}. Say hello!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderUid === currentUser?.uid;
                  const isRead = m.status === 'read';
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] text-slate-500 mb-1 px-1 flex items-center gap-1.5">
                        {isMe ? 'You' : m.senderName || 'Peer'} • {m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        {isMe && (
                          <span title={isRead ? 'Read' : 'Sent'} className={`inline-flex items-center ${isRead ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
                            {isRead ? '✓✓' : '✓'}
                          </span>
                        )}
                      </span>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm space-y-2 leading-relaxed ${
                        isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                      }`}>
                        {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                        {m.attachment?.type === 'image' && (
                          <a href={m.attachment.url} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={m.attachment.url} alt={m.attachment.name} className="max-w-full max-h-72 rounded-xl object-cover border border-white/10" />
                          </a>
                        )}
                        {m.attachment?.type === 'file' && (
                          <a href={m.attachment.url} target="_blank" rel="noopener noreferrer" download={m.attachment.name} className="flex items-center gap-3 rounded-xl bg-black/20 border border-white/10 px-3 py-2.5 hover:bg-black/30 transition">
                            <span className="text-2xl">📎</span>
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold truncate">{m.attachment.name}</span>
                              <span className="block text-[9px] opacity-60">{(m.attachment.size / 1024 / 1024).toFixed(2)} MB</span>
                            </span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <footer className="p-3 bg-slate-900 border-t border-slate-800 relative">
              {typingUsers.length > 0 && (
                <div className="absolute -top-7 left-4 text-[11px] text-indigo-300 italic flex items-center gap-1.5 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-800 shadow">
                  <span className="flex gap-0.5 items-center">
                    <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                  <span>{typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...</span>
                </div>
              )}

              {showEmojiPicker && (
                <div className="absolute bottom-full left-3 mb-2 z-40 w-[min(380px,calc(100vw-24px))] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl p-3 flex flex-col">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-[11px] font-bold text-slate-300">😊 Full Emojis</span>
                    <button type="button" onClick={() => setShowEmojiPicker(false)} className="text-slate-500 hover:text-white">✕</button>
                  </div>
                  <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto pr-1">
                    {emojiCategories[emojiCategory].map((emoji, idx) => (
                      <button key={`${emoji}-${idx}`} type="button" onClick={() => setText(prev => prev + emoji)} className="h-9 rounded-xl text-lg hover:bg-slate-800 transition flex items-center justify-center">
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachment Preview Card */}
              {selectedFile && (
                <div className="mx-1 mb-2.5 p-2.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex-shrink-0">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm text-slate-200 truncate font-medium">
                      {selectedFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition flex-shrink-0"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
                <button type="button" onClick={() => setShowEmojiPicker((v) => !v)} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 transition" title="Choose emoji">😊</button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 transition" title="Attach file">📎</button>
                <input type="text" value={text} onChange={handleInputChange} placeholder={isUploading ? 'Uploading file...' : `Message ${activePeer.displayName}...`} disabled={isUploading} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50" />
                <button type="submit" disabled={(!text.trim() && !selectedFile) || isUploading} className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition shadow-md">
                  <Send className={`w-4 h-4 ${isUploading ? 'animate-pulse' : ''}`} />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs p-6 space-y-2">
            <Users className="w-10 h-10 text-slate-700 mb-1" />
            <p className="font-bold text-white text-sm">Select an Accepted Friend</p>
          </div>
        )}
      </section>
    </main>
  );
}