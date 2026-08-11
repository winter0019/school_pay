export interface HostPersona {
  id: string;
  name: string;
  title: string;
  avatarIcon: string;
  tone: string;
  topics: string[];
  generateWelcome: (members: { name: string; intent?: string }[]) => string;
  generateIntervention: (speakerName: string, promptType: 'dig_deeper' | 'include_quiet' | 'wrap_up') => string;
}

export const HOST_PERSONAS: Record<string, HostPersona> = {
  founder: {
    id: 'founder',
    name: 'Founder AI',
    title: 'Startup & Execution Host',
    avatarIcon: '💼',
    tone: 'Direct, strategic, pragmatic, and goal-driven.',
    topics: ['business', 'tech', 'career', 'finance'],
    generateWelcome: (members) => {
      const names = members.map((m) => m.name).join(', ');
      return `Welcome to the Founder Circle, ${names}. Let's cut through the noise: Take 60 seconds to state your current bottleneck.`;
    },
    generateIntervention: (speakerName, promptType) => {
      if (promptType === 'include_quiet') return `Let's pause there. ${speakerName}, you have experience here—what's your take?`;
      if (promptType === 'dig_deeper') return `${speakerName}, what specific metric or action proved that hypothesis?`;
      return `We have 2 minutes left. What is the single execution step you'll commit to today?`;
    },
  },
  comfort: {
    id: 'comfort',
    name: 'Comfort AI',
    title: 'Empathy & Wellness Host',
    avatarIcon: '❤️',
    tone: 'Warm, supportive, non-judgmental, and gentle.',
    topics: ['personal', 'wellness', 'relationships'],
    generateWelcome: (members) => {
      const names = members.map((m) => m.name).join(', ');
      return `Welcome, ${names}. This is a safe, confidential space. Take a breath, and share what's on your heart today.`;
    },
    generateIntervention: (speakerName, promptType) => {
      if (promptType === 'include_quiet') return `${speakerName}, whenever you feel ready, we're here to listen.`;
      if (promptType === 'dig_deeper') return `Thank you for sharing that, ${speakerName}. How did that feel in the moment?`;
      return `As we wrap up, take a moment to appreciate yourselves for showing up today.`;
    },
  },
  mentor: {
    id: 'mentor',
    name: 'Mentor AI',
    title: 'Career & Wisdom Host',
    avatarIcon: '🧠',
    tone: 'Inquisitive, wise, reflective, and encouraging.',
    topics: ['philosophy', 'psychology', 'education'],
    generateWelcome: (members) => {
      const names = members.map((m) => m.name).join(', ');
      return `Greetings, ${names}. Today we explore ideas and shared growth. Let's begin with open minds.`;
    },
    generateIntervention: (speakerName, promptType) => {
      if (promptType === 'include_quiet') return `${speakerName}, what perspective does this bring to your mind?`;
      if (promptType === 'dig_deeper') return `That's a rich observation, ${speakerName}. What core belief underpins that idea?`;
      return `Before we leave, what is one insight you'll carry with you into the week?`;
    },
  },
};

export function getPersonaForTopic(topic: string): HostPersona {
  const norm = topic.toLowerCase();
  if (['business', 'tech', 'career', 'finance'].includes(norm)) return HOST_PERSONAS.founder;
  if (['personal', 'wellness', 'relationships'].includes(norm)) return HOST_PERSONAS.comfort;
  return HOST_PERSONAS.mentor;
}