export interface NamedAIVoice {
  id: 'hiba' | 'adal' | 'batool';
  name: string;
  role: string;
  description: string;
  avatarIcon: string;
  pitch: number;
  rate: number;
  preferredGender: 'female' | 'male';
}

export const AI_VOICES: Record<string, NamedAIVoice> = {
  hiba: {
    id: 'hiba',
    name: 'Hiba',
    role: 'Empathetic & Insightful Host',
    description: 'Warm, calm, and deeply supportive voice for wellness, philosophy, and personal growth circles.',
    avatarIcon: '✨',
    pitch: 1.1,
    rate: 0.88,
    preferredGender: 'female',
  },
  adal: {
    id: 'adal',
    name: 'Adal',
    role: 'Pragmatic & Strategic Host',
    description: 'Clear, confident, and structured voice for business, career, and tech circles.',
    avatarIcon: '🎯',
    pitch: 0.95,
    rate: 1.0,
    preferredGender: 'male',
  },
  batool: {
    id: 'batool',
    name: 'Batool',
    role: 'Analytical & Research Host',
    description: 'Articulate, inquisitive, and precise voice for deep research summaries and problem-solving.',
    avatarIcon: '🧠',
    pitch: 1.05,
    rate: 0.92,
    preferredGender: 'female',
  },
};

/**
 * Speaks text using the chosen named AI voice persona (Hiba, Adal, or Batool).
 */
export function speakWithNamedVoice(
  text: string,
  voiceId: 'hiba' | 'adal' | 'batool',
  onEnd?: () => void
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return null;
  }

  window.speechSynthesis.cancel();

  const voiceConfig = AI_VOICES[voiceId] || AI_VOICES.hiba;
  const utterance = new SpeechSynthesisUtterance(text);

  utterance.pitch = voiceConfig.pitch;
  utterance.rate = voiceConfig.rate;

  const systemVoices = window.speechSynthesis.getVoices();
  const matchedVoice = systemVoices.find(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.includes(voiceConfig.preferredGender === 'female' ? 'Samantha' : 'Daniel') ||
        v.name.includes('Natural') ||
        v.name.includes('Google'))
  );

  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopNamedVoice(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}