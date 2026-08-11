import { db } from '@/firebase/firestore';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface PromptMilestone {
  minute: number; // Milestone target in elapsed minutes
  promptText: (topic: string) => string;
}

// Structured Facilitator Prompts for each session milestone
export const AI_PROMPT_MILESTONES: PromptMilestone[] = [
  {
    minute: 0,
    promptText: (topic) =>
      `Welcome to the ${topic} Circle! Take 1 minute each to introduce yourselves and share what brought you here today.`,
  },
  {
    minute: 5,
    promptText: (topic) =>
      `Deep Dive (${topic}): What is the single biggest challenge or goal you are navigating right now in this area?`,
  },
  {
    minute: 15,
    promptText: () =>
      `Peer Engagement: Take a moment to respond to what another peer shared. What advice or shared experience can you offer?`,
  },
  {
    minute: 25,
    promptText: () =>
      `Reflection: Looking at today's discussion, what key perspective or takeaway stood out most to you?`,
  },
  {
    minute: 28,
    promptText: () =>
      `Wrap-Up: What is one actionable step you plan to take after today's session?`,
  },
];

/**
 * Calculates the appropriate prompt for the current elapsed time in seconds.
 */
export function getPromptForElapsedSeconds(elapsedSecs: number, topic: string): string {
  const elapsedMins = Math.floor(elapsedSecs / 60);

  // Find the highest milestone reached so far
  let activeMilestone = AI_PROMPT_MILESTONES[0];
  for (const m of AI_PROMPT_MILESTONES) {
    if (elapsedMins >= m.minute) {
      activeMilestone = m;
    }
  }

  const topicName = topic.charAt(0).toUpperCase() + topic.slice(1);
  return activeMilestone.promptText(topicName);
}

/**
 * Updates currentAiPrompt field on the room document in Firestore.
 */
export async function updateRoomAiPrompt(roomId: string, prompt: string): Promise<void> {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      currentAiPrompt: prompt,
      promptUpdatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to update AI prompt on room:', err);
  }
}