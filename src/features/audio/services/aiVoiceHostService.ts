import { HOST_PERSONAS, HostPersona } from '@/features/ai/services/hostPersonaService';

export interface VoiceSettings {
  pitch: number;
  rate: number;
  volume: number;
}

/**
 * Maps AI Host Personas to natural speech synthesis parameters for emotional intelligence.
 */
export function getPersonaVoiceSettings(personaId: string): VoiceSettings {
  switch (personaId) {
    case 'comfort':
      // Softer, slower, warm, and gentle cadence
      return { pitch: 1.0, rate: 0.88, volume: 0.95 };
    case 'founder':
      // Clear, direct, energetic, and engaging
      return { pitch: 1.05, rate: 1.0, volume: 1.0 };
    case 'mentor':
    default:
      // Calm, balanced, reflective tone
      return { pitch: 0.98, rate: 0.92, volume: 1.0 };
  }
}

/**
 * Generates the complete initial audio introduction transcript for a group circle.
 */
export function buildCircleIntroTranscript(
  topic: string,
  persona: HostPersona,
  memberNames: string[]
): string {
  const memberListText = memberNames.length > 0 ? memberNames.join(', ') : 'everyone';

  return (
    `Welcome to the ${topic} Circle! I am your ${persona.name}, your AI host for today. ` +
    `Hello ${memberListText}. ` +
    `Before we begin, here are three simple house rules for our 30-minute session: ` +
    `First, treat every peer with respect and active listening. ` +
    `Second, allow space for everyone to share without interruption. ` +
    `Third, what is shared in this circle stays in this circle. ` +
    `To start our discussion: Please take one minute each to introduce yourself and share what brought you to this circle today.`
  );
}

/**
 * Speaks a transcript using the Web Speech API with persona-tuned audio settings.
 */
export function speakWithAiVoice(
  text: string,
  personaId: string,
  onEnd?: () => void
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return null;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const settings = getPersonaVoiceSettings(personaId);

  utterance.pitch = settings.pitch;
  utterance.rate = settings.rate;
  utterance.volume = settings.volume;

  // Attempt to select a natural English voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))
  );

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Stops any active speech narration.
 */
export function stopAiVoice(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}