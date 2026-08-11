export interface UserProfile {
  // Firebase
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;

  // ConversationOS Profile
  username: string;
  bio: string;

  country: string;
  language: string;

  interests: string[];
  goals: string[];

  personality: string;
  personalityDescription: string;

  // Account Status
  onboardingCompleted: boolean;
  online: boolean;

  // Timestamps
  createdAt: number;
  updatedAt: number;
  lastSeen: number;
}