'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import dynamic from 'next/dynamic';
import { db } from '@/firebase/firestore';
import {
  subscribeToMessages,
  sendMessage,
  updateTyping,
  markConversationRead,
} from '@/features/chat/services/messageService';
import {
  initUserPresence,
  subscribeToPresence,
  type UserPresence,
} from '@/features/chat/services/presenceService';
import { generateSmartReplies } from '@/features/ai/services/aiReplyService';
import { SmartRepliesBar } from '@/features/ai/components/SmartRepliesBar';
import { generateIcebreakers } from '@/features/ai/matching/matchingService';
import { IcebreakerBanner } from '@/features/ai/matching/IcebreakerBanner';
import { moderateContent, type ModerationResult } from '@/features/ai/moderator/moderationService';
import { ModerationWarningModal } from '@/features/ai/moderator/ModerationWarningModal';
import { summarizeConversation, type ChatSummary } from '@/features/ai/summaries/summaryService';
import { SummaryModal } from '@/features/ai/summaries/SummaryModal';
import { TypingIndicator } from '@/features/chat/components/TypingIndicator';
import { VoiceRecorder } from '@/features/chat/components/VoiceRecorder';
import MessageBubble from '@/features/chat/components/MessageBubble';
import type { Message } from '@/features/chat/types';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Smile,
  Mic,
  MoreVertical,
  Sparkles,
  X,
  Image as ImageIcon,
} from 'lucide-react';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

// Helper to convert images to Base64 data URLs
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function ChatRoomPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.conversationId as string;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [partner, setPartner] = useState<{ displayName: string; photoURL?: string; interests?: string[] } | null>(null);
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  // AI State
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);

  // AI Moderation State
  const [moderationResult, setModerationResult] = useState<ModerationResult | null>(null);
  const [showModerationModal, setShowModerationModal] = useState(false);

  // AI Summary State
  const [chatSummary, setChatSummary] = useState<ChatSummary | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  // File Attachment & Voice States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isVoiceRecordingMode, setIsVoiceRecordingMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Auth Listener
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        const cleanupPresence = initUserPresence(user.uid);
        return () => cleanupPresence();
      } else {
        setCurrentUserId('KCojjKOZD0SzPjRzfazoPUQ9JLf1');
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const participantUids = conversationId?.split('_') || [];
  const receiverUid = currentUserId
    ? participantUids.find((uid) => uid !== currentUserId) || ''
    : '';

  // 2. Click outside for Emoji Picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Partner Profile & Presence Subscription
  useEffect(() => {
    if (!receiverUid || !conversationId || !currentUserId) return;

    async function loadPartner() {
      try {
        const snap = await getDoc(doc(db, 'users', receiverUid));
        if (snap.exists()) setPartner(snap.data() as any);
        else setPartner({ displayName: 'Peer Partner' });
      } catch (err) {
        setPartner({ displayName: 'Peer Partner' });
      }
    }

    loadPartner();
    markConversationRead(conversationId, currentUserId);

    const unsubPresence = subscribeToPresence(receiverUid, (data) => setPresence(data));
    const unsubConv = onSnapshot(doc(db, 'conversations', conversationId), (snap) => {
      if (snap.exists()) setIsPartnerTyping(Boolean(snap.data().typing?.[receiverUid]));
    });

    return () => {
      unsubPresence();
      unsubConv();
    };
  }, [conversationId, receiverUid, currentUserId]);

  // 4. Real-time Messages Subscription + AI Triggers
  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = subscribeToMessages(
      conversationId,
      async (newMessages) => {
        setMessages(newMessages);
        setLoading(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        if (currentUserId) {
          if (newMessages.length > 0) {
            const suggestions = await generateSmartReplies(newMessages, currentUserId);
            setSmartReplies(suggestions);
            setIcebreakers([]);
          } else if (partner?.displayName) {
            const starters = generateIcebreakers(partner.displayName, partner.interests || []);
            setIcebreakers(starters);
            setSmartReplies([]);
          }
        }
      },
      (err) => console.error('Subscription error:', err)
    );
    return () => unsubscribe();
  }, [conversationId, currentUserId, partner?.displayName]);

  // File Selection with 700KB Base64 Safety Limit
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 700 * 1024) {
      alert('Without Firebase Storage, attached images must be under 700 KB.');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const base64 = await convertFileToBase64(file);
      setFilePreviewUrl(base64);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEmojiClick = (emojiData: any) => {
    setText((prev) => prev + emojiData.emoji);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (!conversationId || !currentUserId) return;

    updateTyping(conversationId, currentUserId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateTyping(conversationId, currentUserId, false);
    }, 2000);
  };

  const handleSendVoiceNote = async (voiceFile: File) => {
    setIsVoiceRecordingMode(false);
    if (!conversationId || !currentUserId || !receiverUid) return;

    try {
      const base64Audio = await convertFileToBase64(voiceFile);

      await sendMessage({
        conversationId,
        senderUid: currentUserId,
        receiverUid,
        text: '',
        mediaUrl: base64Audio,
        mediaType: 'voice',
        type: 'voice',
      } as any);
      setSmartReplies([]);
    } catch (err) {
      console.error('Failed to send voice note:', err);
    }
  };

  // Auto-Sanitize Callback for Moderation
  const handleSanitizeText = () => {
    setText((prev) => prev.replace(/\b(hate|stupid|idiot|loser|ugly|trash|scam|kill|attack|destroy)\b/gi, '***'));
    setShowModerationModal(false);
  };

  // Summarize Thread Trigger
  const handleSummarizeChat = async () => {
    const summary = await summarizeConversation(messages);
    setChatSummary(summary);
    setShowSummaryModal(true);
  };

  // Submit Handler with AI Moderation Screening
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !selectedFile) || !conversationId || !currentUserId || !receiverUid) return;

    // Real-Time AI Content Moderation Check
    if (text.trim()) {
      const modCheck = await moderateContent(text);
      if (modCheck.isFlagged) {
        setModerationResult(modCheck);
        setShowModerationModal(true);
        return; // Block sending
      }
    }

    const currentText = text.trim();
    const currentFile = selectedFile;
    const currentPreviewUrl = filePreviewUrl;

    setText('');
    setSmartReplies([]);
    setIcebreakers([]);
    setShowEmojiPicker(false);
    clearSelectedFile();

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    updateTyping(conversationId, currentUserId, false);

    try {
      let mediaPayload = undefined;

      if (currentFile && currentPreviewUrl) {
        mediaPayload = {
          mediaUrl: currentPreviewUrl,
          mediaType: 'image',
          type: 'image',
          fileName: currentFile.name,
          fileSize: currentFile.size,
        };
      }

      await sendMessage({
        conversationId,
        senderUid: currentUserId,
        receiverUid,
        text: currentText,
        type: mediaPayload ? 'image' : 'text',
        ...mediaPayload,
      } as any);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <main className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none" />

      {/* HEADER */}
      <header className="px-4 py-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/conversations')} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              {partner?.photoURL ? (
                <img src={partner.photoURL} alt={partner.displayName} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center border border-indigo-500/30">
                  {partner?.displayName?.charAt(0).toUpperCase() || 'P'}
                </div>
              )}
              {presence?.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />}
            </div>
            <div>
              <h2 className="font-semibold text-slate-100 text-sm sm:text-base leading-tight">{partner?.displayName || 'Loading...'}</h2>
              <p className="text-xs text-slate-400">
                {isPartnerTyping ? <span className="text-indigo-400 font-medium animate-pulse">typing...</span> : presence?.online ? <span className="text-emerald-400">Online</span> : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI SUMMARIZE BUTTON */}
          <button
            type="button"
            onClick={handleSummarizeChat}
            className="p-2 sm:px-3 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:text-white hover:bg-indigo-600 transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Summarize</span>
          </button>

          <button className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MESSAGES LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 z-10">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400 mb-2"><Sparkles className="w-6 h-6" /></div>
            <p className="text-sm font-medium text-slate-400 mb-4">No messages yet</p>
            <IcebreakerBanner
              partnerName={partner?.displayName || 'Peer'}
              icebreakers={icebreakers}
              onSelectIcebreaker={(selectedText) => setText(selectedText)}
            />
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg as any}
              currentUid={currentUserId || ''}
            />
          ))
        )}

        {isPartnerTyping && <TypingIndicator partnerName={partner?.displayName} />}
        <div ref={messagesEndRef} />
      </div>

      {/* MEDIA PREVIEW BAR */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between z-10">
            <div className="flex items-center gap-3 min-w-0">
              {filePreviewUrl ? (
                <img src={filePreviewUrl} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center"><ImageIcon className="w-6 h-6" /></div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{selectedFile.name}</p>
                <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB (Base64 Mode)</p>
              </div>
            </div>
            <button onClick={clearSelectedFile} className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EMOJI PICKER POPOVER */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            ref={emojiPickerRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute bottom-16 right-4 sm:right-16 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-800"
          >
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme={'dark' as any}
              lazyLoadEmojis
              searchDisabled={false}
              skinTonesDisabled
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMPOSER / VOICE RECORDER */}
      <footer className="p-3 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 flex-shrink-0 z-10">
        <div className="max-w-4xl mx-auto">
          {/* AI SMART REPLIES SUGGESTIONS BAR */}
          <SmartRepliesBar
            replies={smartReplies}
            onSelectReply={(replyText) => {
              setText(replyText);
              setSmartReplies([]);
            }}
          />

          {isVoiceRecordingMode ? (
            <VoiceRecorder
              onSendVoiceNote={handleSendVoiceNote}
              onCancel={() => setIsVoiceRecordingMode(false)}
            />
          ) : (
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />

              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition">
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                type="text"
                placeholder="Type a message..."
                value={text}
                onChange={handleTextChange}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition"
              />

              <button
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className={`p-2.5 rounded-xl transition ${
                  showEmojiPicker ? 'text-indigo-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Smile className="w-5 h-5" />
              </button>

              {text.trim() || selectedFile ? (
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex-shrink-0 shadow-md shadow-indigo-600/20"
                >
                  <Send className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsVoiceRecordingMode(true)}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition flex-shrink-0"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </form>
          )}
        </div>
      </footer>

      {/* AI MODERATION WARNING MODAL */}
      <ModerationWarningModal
        isOpen={showModerationModal}
        result={moderationResult}
        onClose={() => setShowModerationModal(false)}
        onRewrite={handleSanitizeText}
      />

      {/* AI CHAT SUMMARY MODAL */}
      <SummaryModal
        isOpen={showSummaryModal}
        summary={chatSummary}
        partnerName={partner?.displayName}
        onClose={() => setShowSummaryModal(false)}
      />
    </main>
  );
}