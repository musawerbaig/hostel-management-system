
export type Gender = 'Boys' | 'Girls' | 'Co-Living';

export interface Room {
  id: string;
  number: string;
  isAvailable: boolean;
  capacity: number;
  occupants: number;
  photos: string[];
}

export interface Review {
  id: string;
  hostelId: string;
  rating: number;
  comment: string;
  date: string;
  isVerified: boolean;
  studentName?: string;
}

export interface Hostel {
  id: string;
  name: string;
  city: string;
  gender: Gender;
  minRent: number;
  maxRent: number;
  admissionCharges: number;
  securityFee: number;
  photos: string[];
  ruleBookUrl?: string;
  isVerified: boolean;
  ownerId: string;
  address: string;
  mapUrl?: string;
  description: string;
  rooms: Room[];
  whatsappNumber: string;
  status: 'pending' | 'approved' | 'rejected';
}

export type UserRole = 'Student' | 'Owner' | 'Admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  isApproved?: boolean; // Required for Owners
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
