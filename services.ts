import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import type { Inquiry, InquiryStatus, Review } from './types';
import { islamabadSeedListings } from './seed';

// R2 data services — PRD §8 shapes throughout.
// Firestore stores Timestamps; docToModel converts the known timestamp
// fields to ISO strings so the app layer works with strings only.

const inquiriesCol = collection(db, 'inquiries');
const reviewsCol = collection(db, 'reviews');

function toISO(v: unknown): string {
  if (typeof v === 'string') return v;
  const t = v as { toDate?: () => Date } | null;
  if (t && typeof t.toDate === 'function') return t.toDate().toISOString();
  return new Date().toISOString();
}

export function docToModel<T extends DocumentData>(id: string, data: T): T & { id: string } {
  const out: Record<string, unknown> = { id, ...data };
  for (const k of ['createdAt', 'updatedAt', 'verifiedAt']) {
    if (k in out) out[k] = toISO(out[k]);
  }
  return out as T & { id: string };
}

const byNewest = <T extends { createdAt?: string }>(a: T, b: T) =>
  String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''));

export async function submitInquiry(
  data: Omit<Inquiry, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
): Promise<Inquiry> {
  const now = new Date().toISOString();
  const payload = {
    ...data,
    status: 'new' as InquiryStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(inquiriesCol, payload);
  return { id: ref.id, ...data, status: 'new', createdAt: now, updatedAt: now };
}

async function fetchInquiriesWhere(field: string, value: string): Promise<Inquiry[]> {
  const snap = await getDocs(query(inquiriesCol, where(field, '==', value)));
  return snap.docs
    .map(d => docToModel(d.id, d.data()) as Inquiry)
    .sort(byNewest);
}

export const fetchInquiriesForStudent = (studentId: string) =>
  fetchInquiriesWhere('studentId', studentId);

export const fetchInquiriesForOwner = (ownerId: string) =>
  fetchInquiriesWhere('ownerId', ownerId);

export async function fetchAllInquiries(): Promise<Inquiry[]> {
  const snap = await getDocs(inquiriesCol);
  return snap.docs.map(d => docToModel(d.id, d.data()) as Inquiry).sort(byNewest);
}

export async function updateInquiryStatus(id: string, status: InquiryStatus): Promise<void> {
  await updateDoc(doc(db, 'inquiries', id), { status, updatedAt: serverTimestamp() });
}

export async function fetchAllReviews(): Promise<Review[]> {
  const snap = await getDocs(reviewsCol);
  return snap.docs.map(d => docToModel(d.id, d.data()) as Review).sort(byNewest);
}

export async function submitReview(
  inquiry: Inquiry,
  studentName: string,
  rating: number,
  comment: string,
): Promise<Review> {
  const now = new Date().toISOString();
  const review: Review = {
    id: inquiry.id,
    hostelId: inquiry.hostelId,
    studentId: inquiry.studentId,
    studentName,
    inquiryId: inquiry.id,
    rating,
    comment,
    status: 'visible',
    createdAt: now,
    updatedAt: now,
  };
  // setDoc with the inquiry id: a second review for the same stay cannot
  // overwrite silently — create-only semantics come from firestore.rules.
  await setDoc(doc(db, 'reviews', inquiry.id), {
    ...review,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return review;
}

// Verification documents for one listing. The document id IS the listing
// id; only the owning owner and admins may read it (firestore.rules).
export async function saveVerificationDocs(
  listingId: string,
  ownerId: string,
  urls: string[],
): Promise<void> {
  await setDoc(doc(db, 'verificationDocs', listingId), {
    listingId,
    ownerId,
    urls,
    updatedAt: serverTimestamp(),
  });
}

// Demo seed for the admin dashboard — PRD §8 shapes. Each listing is created
// as 'pending' (the only status the rules allow on create) and immediately
// approved by the admin: status 'live' + verifiedAt/verifiedBy.
// Listings whose name already exists are skipped. Returns how many were added.
export async function seedIslamabadListings(
  adminId: string,
  existingNames: string[],
): Promise<number> {
  let added = 0;
  for (const listing of islamabadSeedListings) {
    if (existingNames.includes(listing.name)) continue;
    const ref = await addDoc(collection(db, 'hostels'), {
      ...listing,
      ownerId: adminId,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await updateDoc(ref, {
      status: 'live',
      verifiedAt: serverTimestamp(),
      verifiedBy: adminId,
      updatedAt: serverTimestamp(),
    });
    added++;
  }
  return added;
}
