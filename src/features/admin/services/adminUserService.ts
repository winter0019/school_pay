import { db } from '@/firebase/firestore';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export interface ManagedUser {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  role: 'admin' | 'moderator' | 'user';
  status: 'active' | 'suspended' | 'banned';
  createdAt?: string;
  lastActive?: string;
}

/**
 * Fetches all registered users from Firestore for administrative management.
 */
export async function getAllManagedUsers(): Promise<ManagedUser[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users: ManagedUser[] = [];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      users.push({
        uid: docSnap.id,
        displayName: data.displayName || 'Anonymous User',
        email: data.email || 'No email associated',
        photoURL: data.photoURL,
        role: data.role || 'user',
        status: data.status || 'active',
        createdAt: data.createdAt?.seconds
          ? new Date(data.createdAt.seconds * 1000).toLocaleDateString()
          : 'Recent',
        lastActive: data.lastActive?.seconds
          ? new Date(data.lastActive.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Active now',
      });
    });

    return users;
  } catch (err) {
    console.error('Failed to fetch managed users:', err);
    return [];
  }
}

/**
 * Updates a user's administrative role (admin, moderator, user).
 */
export async function updateUserRole(uid: string, role: 'admin' | 'moderator' | 'user'): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      role,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error('Failed to update user role:', err);
    return false;
  }
}

/**
 * Updates a user's account status (active, suspended, banned).
 */
export async function updateUserStatus(uid: string, status: 'active' | 'suspended' | 'banned'): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      status,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error('Failed to update user status:', err);
    return false;
  }
}