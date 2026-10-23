import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User, UserRole } from './types';

// Hostela accounts are real Firebase Auth accounts.
// The role lives in a Firestore profile at users/{uid} — the app and the
// Firestore security rules both read the role from there, never from
// anything hardcoded in the frontend.

const avatarFor = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

function toAppUser(uid: string, data: Record<string, unknown>): User {
  return {
    id: uid,
    email: String(data.email ?? ''),
    name: String(data.name ?? 'Hostela User'),
    role: (data.role as UserRole) ?? 'Student',
    isApproved: Boolean(data.isApproved),
    avatar: avatarFor(String(data.email ?? uid)),
  };
}

export async function fetchProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return toAppUser(uid, snap.data() as Record<string, unknown>);
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
  role: Exclude<UserRole, 'Admin'>,
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const profile = {
    email,
    name,
    role,
    // Students are usable immediately. Owners must be approved by an admin
    // (Firestore console for now; approval screen is Phase 2) before the
    // security rules let them publish listings.
    isApproved: role === 'Student',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', cred.user.uid), profile);
  return toAppUser(cred.user.uid, profile);
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await fetchProfile(cred.user.uid);
  if (profile) return profile;
  // Account exists in Auth but has no profile document (e.g. created in the
  // Firebase console). Create a basic Student profile so the user can proceed;
  // an admin can change the role in Firestore afterwards.
  const fallback = {
    email,
    name: cred.user.displayName ?? 'Hostela User',
    role: 'Student' as UserRole,
    isApproved: true,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', cred.user.uid), fallback);
  return toAppUser(cred.user.uid, fallback);
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

// Keeps the app in sync with the real login session across refreshes.
export function watchAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      callback(null);
      return;
    }
    try {
      callback(await fetchProfile(fbUser.uid));
    } catch {
      callback(null);
    }
  });
}
