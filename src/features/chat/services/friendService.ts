import {
  collection,
  addDoc,
  doc,
  getDocs,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';

export class FriendService {
  /**
   * Sends a new friend request to a target user
   */
  async sendFriendRequest(senderUid: string, senderName: string, receiverUid: string, receiverName: string) {
    try {
      await addDoc(collection(db, 'friend_requests'), {
        senderUid,
        senderName,
        receiverUid,
        receiverName,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to send friend request:', err);
      throw err;
    }
  }

  /**
   * Accepts an incoming friend request, creating a permanent partnership record
   */
  async acceptFriendRequest(requestId: string, currentUid: string, senderUid: string) {
    try {
      // Create the pair document in 'friends' using deterministic sorting
      const pairKey = [currentUid, senderUid].sort().join('_');
      await addDoc(collection(db, 'friends'), {
        pairKey,
        users: [currentUid, senderUid],
        status: 'accepted',
        createdAt: serverTimestamp(),
      });

      // Remove the pending friend request
      await deleteDoc(doc(db, 'friend_requests', requestId));
    } catch (err) {
      console.error('Failed to accept friend request:', err);
      throw err;
    }
  }

  /**
   * Subscribes to accepted friends for a given user in real-time
   */
  subscribeToFriends(currentUid: string, callback: (friends: string[]) => void) {
    const q = query(collection(db, 'friends'), where('users', 'array-contains', currentUid));

    return onSnapshot(q, (snapshot) => {
      const friendUids: string[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const otherUser = data.users.find((u: string) => u !== currentUid);
        if (otherUser) {
          friendUids.push(otherUser);
        }
      });
      callback(friendUids);
    }, (error) => {
      console.warn('Friends subscription error:', error);
      callback([]);
    });
  }
}

export const friendService = new FriendService();