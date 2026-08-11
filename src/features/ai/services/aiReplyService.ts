import type { Message } from '@/features/chat/types';

export async function generateSmartReplies(
  messages: Message[],
  currentUserId: string
): Promise<string[]> {
  if (!messages || messages.length === 0) return [];

  const recentMessages = messages.slice(-5);
  const lastMessage = recentMessages[recentMessages.length - 1];

  if (lastMessage?.senderUid === currentUserId) {
    return [];
  }

  const lastText = (lastMessage?.text || '').toLowerCase().trim();

  if (lastText.includes('how are you') || lastText.includes('how r u') || lastText.includes('doing')) {
    return ['I’m doing great, thanks! How about you?', 'All good here! What about you?', 'Doing well! Just keeping busy.'];
  }

  if (lastText.includes('where') || lastText.includes('location') || lastText.includes('country')) {
    return ['I am currently at home.', 'Not far from here!', 'Let me check and send you my location.'];
  }

  if (lastText.includes('free') || lastText.includes('available') || lastText.includes('meet') || lastText.includes('time')) {
    return ['Yes, I am free right now!', 'Give me about 15 minutes.', 'Catch you later today!'];
  }

  if (lastText.includes('thanks') || lastText.includes('thank you') || lastText.includes('thx')) {
    return ['You’re very welcome!', 'No problem at all!', 'Anytime! 👍'];
  }

  if (lastText.includes('ok') || lastText.includes('great') || lastText.includes('awesome') || lastText.includes('sounds good')) {
    return ['Sounds good to me!', 'Perfect! 👍', 'Talk soon!'];
  }

  if (lastText.endsWith('?')) {
    return ['Yes, absolutely!', 'Let me check and get back to you.', 'I’m not quite sure yet.'];
  }

  return ['Got it, thanks!', 'Sounds like a plan!', 'Let’s catch up soon!'];
}