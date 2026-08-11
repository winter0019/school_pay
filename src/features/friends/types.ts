export interface FriendProfile {
  uid: string;
  displayName: string;
  username: string;
  photoURL?: string;
  bio?: string;
  country?: string;
  online?: boolean;
  lastSeen?: number;
}