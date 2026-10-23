
import { Hostel, Review, User } from './types';

// Phase 1 (security): the old hardcoded admin accounts + PINs were removed.
// Admins are now real Firebase Auth accounts whose Firestore profile in
// users/{uid} has role: 'Admin' (set manually in the Firebase console —
// see README "Making the first admin"). Nothing secret belongs in this file.

// Support number used by the footer contact icon. Student contact with
// owners now happens through the Phase 2 inquiry flow (services.ts).
export const ADMIN_WHATSAPP = '923001112222';

// Demo fallback listings shown only when Firestore has no hostels yet.
// Phase 3 replaces these with real Islamabad / COMSATS-area seed data.
export const mockHostels: Hostel[] = [
  {
    id: '1',
    name: 'Sunshine Boys Hostel',
    city: 'Lahore',
    gender: 'Boys',
    minRent: 12000,
    maxRent: 18000,
    admissionCharges: 5000,
    securityFee: 10000,
    photos: ['https://picsum.photos/seed/hostel1/800/600', 'https://picsum.photos/seed/hostel1b/800/600'],
    ruleBookUrl: 'https://picsum.photos/seed/rules1/600/800',
    isVerified: true,
    ownerId: 'owner1',
    address: 'Block H3, Johar Town, Lahore',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3402.5516024985255!2d74.26781217625121!3d31.48152574906567!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x391903dc08f51a7b%3A0x892994e637766336!2sJohar%20Town%2C%20Lahore%2C%20Punjab!5e0!3m2!1sen!2spk!4v1700000000000',
    description: 'A clean and quiet environment for students near major universities.',
    rooms: [
      { id: 'r1', number: '101', isAvailable: true, capacity: 3, occupants: 1, photos: ['https://picsum.photos/seed/room101/400/300'] },
      { id: 'r2', number: '102', isAvailable: false, capacity: 2, occupants: 2, photos: ['https://picsum.photos/seed/room102/400/300'] }
    ],
    whatsappNumber: '923001234567',
    status: 'approved'
  },
  {
    id: '2',
    name: 'Elite Girls Residence',
    city: 'Karachi',
    gender: 'Girls',
    minRent: 25000,
    maxRent: 45000,
    admissionCharges: 10000,
    securityFee: 20000,
    photos: ['https://picsum.photos/seed/hostel2/800/600', 'https://picsum.photos/seed/hostel2b/800/600'],
    ruleBookUrl: 'https://picsum.photos/seed/rules2/600/800',
    isVerified: true,
    ownerId: 'owner1',
    address: 'DHA Phase 5, Karachi',
    mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3620.3217624985255!2d67.0678!3d24.8!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDQ4JzAwLjAiTiA2N8KwMDQnMDQuOCJF!5e0!3m2!1sen!2s!4v1700000000000',
    description: 'Premium facilities with 24/7 security and high-speed internet.',
    rooms: [
      { id: 'r3', number: 'A1', isAvailable: true, capacity: 2, occupants: 0, photos: ['https://picsum.photos/seed/roomA1/400/300'] }
    ],
    whatsappNumber: '923117654321',
    status: 'approved'
  }
];

export const mockReviews: Review[] = [
  { id: 'demo-inquiry-1', hostelId: '1', studentId: 'demo-student-1', inquiryId: 'demo-inquiry-1', rating: 5, comment: 'Best food quality in this area.', date: '2023-10-12', isVerified: true, studentName: 'Ahmed K.' },
  { id: 'demo-inquiry-2', hostelId: '1', studentId: 'demo-student-2', inquiryId: 'demo-inquiry-2', rating: 4, comment: 'Staff is very helpful.', date: '2023-11-01', isVerified: true, studentName: 'Sara L.' }
];

export const isAdminUser = (user: User | null) => user?.role === 'Admin';
