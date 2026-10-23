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
} from 'firebase/firestore';
import { Inquiry, InquiryStatus, Review } from './types';
import { islamabadSeedListings } from './seed';

// Phase 2 data services: student inquiries + gated, persisted reviews.
// The gating is enforced server-side by firestore.rules — a review document
// can only be created with id == inquiryId, and only when that inquiry's
// status is 'stayed' and it belongs to the signed-in student.

const inquiriesCol = collection(db, 'inquiries');
const reviewsCol = collection(db, 'reviews');

const byNewest = <T extends { createdAt?: string; date?: string }>(a: T, b: T) =>
  String(b.createdAt ?? b.date ?? '').localeCompare(String(a.createdAt ?? a.date ?? ''));

export async function submitInquiry(
  data: Omit<Inquiry, 'id' | 'status' | 'createdAt'>
): Promise<Inquiry> {
  const payload = { ...data, status: 'new' as InquiryStatus, createdAt: new Date().toISOString() };
  const ref = await addDoc(inquiriesCol, payload);
  return { id: ref.id, ...payload };
}

async function fetchInquiriesWhere(field: string, value: string): Promise<Inquiry[]> {
  const snap = await getDocs(query(inquiriesCol, where(field, '==', value)));
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<Inquiry, 'id'>) }))
    .sort(byNewest);
}

export const fetchInquiriesForStudent = (studentId: string) =>
  fetchInquiriesWhere('studentId', studentId);

export const fetchInquiriesForOwner = (ownerId: string) =>
  fetchInquiriesWhere('ownerId', ownerId);

export async function fetchAllInquiries(): Promise<Inquiry[]> {
  const snap = await getDocs(inquiriesCol);
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<Inquiry, 'id'>) }))
    .sort(byNewest);
}

export async function updateInquiryStatus(id: string, status: InquiryStatus): Promise<void> {
  await updateDoc(doc(db, 'inquiries', id), { status });
}

export async function fetchAllReviews(): Promise<Review[]> {
  const snap = await getDocs(reviewsCol);
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<Review, 'id'>) }))
    .sort(byNewest);
}

export async function submitReview(
  inquiry: Inquiry,
  studentName: string,
  rating: number,
  comment: string
): Promise<Review> {
  const review: Review = {
    id: inquiry.id,
    hostelId: inquiry.hostelId,
    studentId: inquiry.studentId,
    inquiryId: inquiry.id,
    studentName,
    rating,
    comment,
    date: new Date().toISOString().split('T')[0],
    isVerified: true,
  };
  // setDoc with the inquiry id: a second review for the same stay cannot
  // overwrite silently — create-only semantics come from firestore.rules.
  await setDoc(doc(db, 'reviews', inquiry.id), review);
  return review;
}

// Phase 3: one-click demo seed for the admin dashboard. Creates each
// Islamabad listing as 'pending' (the only status the rules allow on
// create) and immediately approves it — admins may update any listing.
// Listings whose name already exists are skipped. Returns how many were added.
export async function seedIslamabadListings(
  adminId: string,
  existingNames: string[]
): Promise<number> {
  let added = 0;
  for (const listing of islamabadSeedListings) {
    if (existingNames.includes(listing.name)) continue;
    const ref = await addDoc(collection(db, 'hostels'), {
      ...listing,
      ownerId: adminId,
      status: 'pending',
      isVerified: true,
      createdAt: new Date().toISOString(),
    });
    await updateDoc(ref, { status: 'approved' });
    added++;
  }
  return added;
}
