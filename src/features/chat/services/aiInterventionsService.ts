import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firestore';

export const aiInterventionsService = {
  // Check if conversation has stalled and trigger a smart, contextual AI nudge
  async checkAndTriggerSilenceNudge(roomId: string, aiHostName: string = 'Hiba') {
    try {
      const messagesRef = collection(db, 'rooms', roomId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(5));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return;

      const messages: any[] = [];
      snapshot.forEach((doc) => messages.unshift(doc.data()));

      // Prevent duplicate consecutive nudges if the last message was already from the AI host
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderUid === 'ai_host_bot' || lastMessage.type === 'ai_nudge') {
        return;
      }

      const lastMessageTime = lastMessage.createdAt?.seconds ? lastMessage.createdAt.seconds * 1000 : Date.now();
      const idleTimeSeconds = (Date.now() - lastMessageTime) / 1000;

      // If room has been idle for more than 120 seconds (2 minutes), prompt Gemini for a smart nudge
      if (idleTimeSeconds > 120) {
        const transcript = messages.map(m => `${m.senderName}: ${m.text}`).join('\n');

        // Call API route to get a dynamic contextual nudge
        const response = await fetch('/api/room-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            context: `The conversation has gone quiet. Based on this recent transcript:\n${transcript}\n\nAs AI host ${aiHostName}, provide a short, single engaging follow-up question or thought-provoking prompt to help them continue their discussion.` 
          }),
        });

        const data = await response.json();
        const nudgeText = data.reply || `What are your thoughts on how to apply what you just shared?`;

        await addDoc(messagesRef, {
          roomId,
          senderUid: 'ai_host_bot',
          senderName: `🤖 AI Host (${aiHostName})`,
          text: nudgeText,
          type: 'ai_nudge',
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('AI silence nudge error:', err);
    }
  },
};