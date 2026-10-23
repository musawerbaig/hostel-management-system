
import { Hostel, Review, User } from './types';
import { islamabadSeedListings } from './seed';

// Phase 1 (security): the old hardcoded admin accounts + PINs were removed.
// Admins are now real Firebase Auth accounts whose Firestore profile in
// users/{uid} has role: 'Admin' (set manually in the Firebase console —
// see README "Making the first admin"). Nothing secret belongs in this file.

// Support number used by the footer contact icon. Student contact with
// owners now happens through the Phase 2 inquiry flow (services.ts).
export const ADMIN_WHATSAPP = '923001112222';

// Demo fallback listings shown only when Firestore has no hostels yet.
// Phase 3 replaces these with real Islamabad / COMSATS-area seed data.
// Fallback listings shown only when Firestore has no hostels yet — the
// first four Phase 3 Islamabad seed listings (see seed.ts).
export const mockHostels: Hostel[] = islamabadSeedListings.slice(0, 4).map((l, i) => ({
  ...l,
  id: `isb-${i + 1}`,
  ownerId: 'demo-owner',
  status: 'approved' as const,
  isVerified: true,
}));

export const mockReviews: Review[] = [
  { id: 'demo-inquiry-1', hostelId: 'isb-1', studentId: 'demo-student-1', inquiryId: 'demo-inquiry-1', rating: 5, comment: 'Best food quality in this area.', date: '2023-10-12', isVerified: true, studentName: 'Ahmed K.' },
  { id: 'demo-inquiry-2', hostelId: 'isb-1', studentId: 'demo-student-2', inquiryId: 'demo-inquiry-2', rating: 4, comment: 'Staff is very helpful.', date: '2023-11-01', isVerified: true, studentName: 'Sara L.' }
];

export const isAdminUser = (user: User | null) => user?.role === 'Admin';
