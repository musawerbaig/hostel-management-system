// Hostela data model — PRD v2 §8, exact build contract.
// Field names, value sets and statuses below are the PRD's, not the v1
// prototype's. Anything the PRD does not define (the old "rooms" model,
// minRent/maxRent, capitalised roles, status 'approved') was removed in R2.
//
// Firestore stores real Timestamps; the app layer converts them to ISO
// strings on read (see docToModel in services.ts), so every interface here
// uses strings for dates.

export type UserRole = 'student' | 'owner' | 'admin';
export type AccountStatus = 'active' | 'suspended';

export interface User {
  id: string; // Firebase Auth uid; also the document id
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  university?: string; // students only
  cnicNumber?: string; // owners only; private, never shown publicly
  status: AccountStatus;
  avatar?: string; // client-side display only, not a Firestore field
  createdAt: string;
  updatedAt: string;
}

export type Gender = 'boys' | 'girls';
export type RoomType = 'single' | 'shared-2' | 'shared-3' | 'dorm';
export type Amenity =
  | 'wifi'
  | 'mess'
  | 'backup-power'
  | 'laundry'
  | 'attached-bath'
  | 'security'
  | 'parking'
  | 'study-room';
export type HostelStatus = 'draft' | 'pending' | 'live' | 'rejected' | 'paused' | 'suspended';

export interface Hostel {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  area: string;
  address: string;
  latitude: number;
  longitude: number;
  gender: Gender;
  roomTypes: RoomType[];
  pricePerBedMonthly: number; // PKR per bed per month — the headline price
  messAvailable: boolean;
  messPriceMonthly: number; // PKR per month; 0 when no mess
  securityDeposit: number; // PKR one-time; 0 when none
  otherChargesNote: string;
  totalBeds: number;
  bedsAvailable: number;
  availableFrom: string; // ISO date
  amenities: Amenity[];
  rules: string;
  photos: string[]; // Cloudinary URLs; 3–10, first is the cover
  verificationDocs: string[]; // legacy field, always empty; see below
  hasVerificationDocs: boolean; // true when the owner uploaded verification docs
  // Verification document URLs live ONLY in the `verificationDocs`
  // collection (owner + admin read) — never in this public document.
  nearbyUniversities: string[];
  status: HostelStatus;
  rejectionReason: string; // set on reject, shown to the owner
  ownerReachable: boolean; // admin-confirmed reachable-owner test (PRD §5)
  verifiedAt: string; // '' until first approval
  verifiedBy: string; // uid of the approving admin
  createdAt: string;
  updatedAt: string;
}

export type InquiryStatus = 'new' | 'contacted' | 'stayed' | 'closed';

export interface Inquiry {
  id: string;
  hostelId: string;
  hostelName: string; // denormalised for list views
  ownerId: string; // copied from the listing so the owner inbox is one query
  studentId: string;
  studentName: string; // denormalised for list views
  studentPhone: string; // copied at send time; the owner's reply channel
  moveInDate: string; // ISO date
  bedsNeeded: number;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
}

export type ReviewStatus = 'visible' | 'reported' | 'removed';

export interface Review {
  id: string; // = inquiryId (one review per confirmed stay)
  hostelId: string;
  studentId: string;
  studentName?: string;
  inquiryId: string;
  rating: number; // 1–5
  comment: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

// COMSATS University Islamabad, Chak Shahzad campus — the PRD launch anchor.
// Distances are calculated from listing pins to this point (haversine),
// never stored as approximations.
export const COMSATS = {
  name: 'COMSATS University Islamabad',
  latitude: 33.6516,
  longitude: 73.1566,
};

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export type Language = 'en' | 'ur' | 'ar';

export interface TranslationSet {
  welcome: string;
  searchHostels: string;
  addHostel: string;
  ownerPortal: string;
  adminPortal: string;
  rentRange: string;
  gender: string;
  boys: string;
  girls: string;
  coLiving: string;
  verified: string;
  contactAdmin: string;
  reviews: string;
  verifiedStudent: string;
  adminNote: string;
  availability: string;
  roomNumber: string;
  approve: string;
  reject: string;
  ownersLogin: string;
  addReview: string;
  studentLogin: string;
  admissionCharges: string;
  securityFee: string;
  ruleBook: string;
  pendingApproval: string;
}

// Top-level screens of the single-page app.
export type View = 'home' | 'details' | 'owner-dashboard' | 'admin-dashboard' | 'add-hostel' | 'login' | 'signup' | 'edit-hostel' | 'my-inquiries';
