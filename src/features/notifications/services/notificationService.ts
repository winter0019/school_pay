import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/firestore';

export const notificationService = {
  // Existing notification methods...
  async registerDeviceToken(uid: string) {
    // ...
  },
  
  showNotification(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  },

  /**
   * Subscribes to real-time friend requests for a user
   */
  subscribeToFriendRequests(userId: string, callback: (requests: any[]) => void) {
    const q = query(
      collection(db, 'friend_requests'),
      where('receiverUid', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const requests: any[] = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      callback(requests);
    }, (error) => {
      console.warn('Friend requests subscription error:', error);
    });
  }
};

// Standalone export matching named hook imports (e.g. useNotifications.ts)
export const subscribeToFriendRequests = (userId: string, callback: (requests: any[]) => void) => {
  return notificationService.subscribeToFriendRequests(userId, callback);
};