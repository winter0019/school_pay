import type { UserProfile } from "@/types/user";

export interface FriendRequestNotification {
  id: string;

  senderUid: string;
  receiverUid: string;

  status: "pending" | "accepted" | "declined";

  createdAt?: unknown;

  sender?: UserProfile;
}