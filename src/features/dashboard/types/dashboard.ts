export interface MatchUser {
  uid: string;
  username: string;
  photoURL: string;

  country: string;

  matchScore: number;

  interests: string[];
}

export interface ConversationPreview {
  id: string;

  name: string;

  photoURL: string;

  lastMessage: string;

  unread: number;

  updatedAt: number;
}

export interface DashboardStats {
  profileCompletion: number;

  aiScore: number;

  connections: number;
}