import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { auth } from "@/firebase/config";

const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  return signInWithPopup(auth, provider);
}

export async function loginAsGuest() {
  return signInAnonymously(auth);
}

export async function register(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}
