import type { Message } from '@/features/chat/types';

export interface ChatSummary {
  overview: string;
  keyPoints: string[];
  actionItems: string[];
}

/**
 * Generates an executive summary and key points from a chat thread.
 */
export async function summarizeConversation(messages: Message[]): Promise<ChatSummary> {
  if (!messages || messages.length === 0) {
    return {
      overview: 'No messages available in this conversation to summarize.',
      keyPoints: [],
      actionItems: [],
    };
  }

  const textMessages = messages
    .filter((m) => m.text && !m.deleted)
    .map((m) => m.text);

  if (textMessages.length === 0) {
    return {
      overview: 'Conversation contains media attachments without text messages.',
      keyPoints: ['Shared media or audio notes.'],
      actionItems: [],
    };
  }

  // Extract key topics for client summary
  const topics: string[] = [];
  const actionItems: string[] = [];

  textMessages.forEach((msg) => {
    const text = msg.toLowerCase();
    if (text.includes('meet') || text.includes('time') || text.includes('free') || text.includes('call')) {
      topics.push('Scheduling & Availability');
    }
    if (text.includes('location') || text.includes('country') || text.includes('where')) {
      topics.push('Location & Coordinates');
    }
    if (text.includes('project') || text.includes('work') || text.includes('build') || text.includes('code')) {
      topics.push('Project Collaboration');
    }
    if (text.includes('send') || text.includes('check') || text.includes('let you know')) {
      actionItems.push(msg);
    }
  });

  const uniqueTopics = Array.from(new Set(topics));

  return {
    overview: `Summarized thread of ${messages.length} messages. Primary discussion focused on ${
      uniqueTopics.length > 0 ? uniqueTopics.join(', ') : 'general catching up'
    }.`,
    keyPoints:
      uniqueTopics.length > 0
        ? uniqueTopics.map((t) => `Discussed ${t}`)
        : ['General conversation and greeting exchange'],
    actionItems: actionItems.slice(0, 3),
  };
}