import { collection, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firestore';

export const roomAiService = {
  // Fetch recent messages from the room to analyze
  async getRoomDiscussionContext(roomId: string): Promise<string> {
    try {
      const messagesRef = collection(db, 'rooms', roomId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);

      let context = '';
      snapshot.forEach((doc) => {
        const data = doc.data();
        context += `${data.senderName || 'User'}: ${data.text || '[Attachment]'}\n`;
      });
      return context;
    } catch (err) {
      console.error('Error fetching room context:', err);
      return '';
    }
  },

  // Request AI summary, recommendations, and solutions
  async requestAiSummaryAndSolutions(roomId: string, aiHostName: string = 'Hiba') {
    const discussionContext = await this.getRoomDiscussionContext(roomId);
    if (!discussionContext.trim()) {
      return 'No discussion history found yet to analyze.';
    }

    try {
      // Call your API route with safety checks for response parsing
      const response = await fetch('/api/room-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: discussionContext }),
      });

      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : {};
      const aiReply = data.reply || 'Here are some insights and recommendations based on your discussion...';

      // Post the AI response back into the room messages so all members can see it
      const messagesRef = collection(db, 'rooms', roomId, 'messages');
      await addDoc(messagesRef, {
        senderUid: 'ai_host_bot',
        senderName: `AI Host (${aiHostName})`,
        text: aiReply,
        createdAt: serverTimestamp(),
      });

      return aiReply;
    } catch (err) {
      console.error('AI summary error:', err);
      return 'Failed to generate AI insights at the moment.';
    }
  },
};