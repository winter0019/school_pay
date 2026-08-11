export interface CircleTopic {
  id: string;
  title: string;
  description: string;
  category: 'Wellness' | 'Growth' | 'Technology' | 'Life';
  icon: string;
}

export const PREDEFINED_TOPICS: CircleTopic[] = [
  {
    id: 'mental-wellness',
    title: 'Mental Wellness & Stress',
    description: 'Share coping strategies for stress, anxiety, and daily burnout.',
    category: 'Wellness',
    icon: '🌿',
  },
  {
    id: 'career-leadership',
    title: 'Career & Leadership',
    description: 'Discuss promotions, management, work-life balance, and ambition.',
    category: 'Growth',
    icon: '💼',
  },
  {
    id: 'startup-entrepreneurship',
    title: 'Startups & Business',
    description: 'Bounce ideas, tackle execution bottlenecks, and discuss growth.',
    category: 'Growth',
    icon: '🚀',
  },
  {
    id: 'philosophy-meaning',
    title: 'Philosophy & Life Meaning',
    description: 'Explore Stoicism, purpose, decision-making, and deep ideas.',
    category: 'Life',
    icon: '🏛️',
  },
  {
    id: 'tech-ai-ethics',
    title: 'Tech Innovation & AI',
    description: 'Debate future tech trends, software architecture, and AI impact.',
    category: 'Technology',
    icon: '💻',
  },
  {
    id: 'relationships-family',
    title: 'Relationships & Family',
    description: 'Navigate friendships, romantic bonds, and family dynamics.',
    category: 'Life',
    icon: '❤️',
  },
  {
    id: 'personal-finance',
    title: 'Personal Finance & Money',
    description: 'Discuss budgeting, investing mindset, and financial independence.',
    category: 'Growth',
    icon: '💰',
  },
  {
    id: 'productivity-habits',
    title: 'Productivity & Habits',
    description: 'Build sustainable daily systems and overcome procrastination.',
    category: 'Growth',
    icon: '⚡',
  },
  {
    id: 'grief-healing',
    title: 'Grief & Healing',
    description: 'A compassionate space for navigating loss and difficult life changes.',
    category: 'Wellness',
    icon: '🕊️',
  },
  {
    id: 'creative-arts',
    title: 'Creative Arts & Writing',
    description: 'Share inspiration, creative blockages, and artistic goals.',
    category: 'Life',
    icon: '🎨',
  },
  {
    id: 'fitness-health',
    title: 'Fitness & Physical Health',
    description: 'Talk energy levels, workout routines, and physical well-being.',
    category: 'Wellness',
    icon: '🏋️',
  },
  {
    id: 'education-learning',
    title: 'Education & Continuous Learning',
    description: 'Study techniques, skill building, and lifelong curiosity.',
    category: 'Growth',
    icon: '📚',
  },
];

// Guest Pseudonym Generator Data
const ADJECTIVES = [
  'Mindful',
  'Resilient',
  'Quiet',
  'Thoughtful',
  'Curious',
  'Gentle',
  'Bold',
  'Steady',
  'Insightful',
  'Empathetic',
];

const NOUNS = [
  'Explorer',
  'Thinker',
  'Voyager',
  'Listener',
  'Seeker',
  'Partner',
  'Architect',
  'Guide',
  'Scholar',
  'Pioneer',
];

/**
 * Generates an inspiring guest pseudonym (e.g., "Mindful Explorer #482").
 */
export function generateGuestPseudonym(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${adj} ${noun} #${randomNum}`;
}