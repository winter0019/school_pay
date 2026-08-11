"use client";

import { useEffect, useState } from "react";

import { subscribeToFriendRequests } from "../services/notificationService";

import { useUserStore } from "@/store/userStore";

export default function useNotifications() {
  const user = useUserStore((s) => s.user);

  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    return subscribeToFriendRequests(user.uid, setRequests);
  }, [user]);

  return {
    requests,
  };
}