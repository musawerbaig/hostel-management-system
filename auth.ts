import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { User, UserRole, AccountStatus } from './types';

// Hostela accounts are real Firebase Auth accounts.
// The role lives in a Firestore profile at users/{uid} — the app and the
// Firestore security rules both read the role from there, never from
// anything hardcoded in the frontend. Roles and statuses are the PRD §8
// lowercase values. Legacy capitalised roles (pre-R2 documents) are
// normalised on read so the migration does not lock anyone out.

const avatarFor = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

function normaliseRole(value: unknown): UserRole {
  const v = String(value ?? '').toLowerCase();
  if (v === 'owner' || v === 'admin') return v;
  return 'student';
}

function toAppUser(uid: string, data: Record<string, unknown>): User {
  const now = new Date().toISOString();
  const ts = (v: unknown): string => {
    if (typeof v === 'string') return v;
    const t = v as { toDate?: () => Date } | null;
    if (t && typeof t.toDate === 'function') return t.toDate().toISOString();
    return now;
  };
  return {
    id: uid,
    email: String(data.email ?? ''),
    fullName: String(data.fullName ?? data.name ?? 'Hostela User'),
    role: normaliseRole(data.role),
    phone: String(data.phone ?? ''),
    university: data.university ? String(data.university) : undefined,
    cnicNumber: data.cnicNumber ? String(data.cnicNumber) : undefined,
    status: (data.status === 'suspended' ? 'suspended' : 'active') as AccountStatus,
    avatar: avatarFor(String(data.email ?? uid)),
    createdAt: ts(data.createdAt),
    updatedAt: ts(data.updatedAt),
  };
}

export async function fetchProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return toAppUser(uid, snap.data() as Record<string, unknown>);
}

export async function signUpWithEmail(
  fullName: string,
  email: string,
  password: string,
  role: Exclude<UserRole, 'admin'>,
  phone: string,
  university?: string,
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // PRD §8.1: one account, one role; accounts start 'active'. There is no
  // owner-approval gate on accounts — the PRD verifies *listings*, not
  // accounts (R1's isApproved concept was removed in R2).
  const profile = {
    email,
    fullName,
    role,
    phone,
    ...(university ? { university } : {}),
    status: 'active' as AccountStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'users', cred.user.uid), profile);
  const now = new Date().toISOString();
  return {
    id: cred.user.uid,
    email,
    fullName,
    role,
    phone,
    university,
    status: 'active',
    avatar: avatarFor(email),
    createdAt: now,
    updatedAt: now,
  };
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await fetchProfile(cred.user.uid);
  if (profile) return profile;
  // Account exists in Auth but has no profile document (e.g. created in the
  // Firebase console). Create a basic student profile so the user can proceed;
  // an admin can change the role in Firestore afterwards.
  const now = new Date().toISOString();
  const fallback = {
    email,
    fullName: cred.user.displayName ?? 'Hostela User',
    role: 'student' as UserRole,
    phone: '',
    status: 'active' as AccountStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'users', cred.user.uid), fallback);
  return {
    id: cred.user.uid,
    email,
    fullName: fallback.fullName,
    role: 'student',
    phone: '',
    status: 'active',
    avatar: avatarFor(email),
    createdAt: now,
    updatedAt: now,
  };
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
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
