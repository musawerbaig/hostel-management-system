import { User } from './types';

// Phase 1 (security): the old hardcoded admin accounts + PINs were removed.
// R1 (production audit): the demo mock listings/reviews and the placeholder
// "admin WhatsApp" number were removed — production surfaces must never
// present fabricated listings, reviews or contact numbers as real.
// Admins are real Firebase Auth accounts whose Firestore profile in
// users/{uid} has role: 'admin' (see README "Making the first admin").

export const isAdminUser = (user: User | null) => user?.role === 'admin';
