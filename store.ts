
import { Hostel, Review, User, UserRole, Gender } from './types';

// Mock Admins - 1 Main, 2 Co-Admins with Security PINs for MFA
export const ADMINS = [
  { email: 'admin@hostela.com', name: 'Main Admin', role: 'Admin', pin: '998877' },
  { email: 'coadmin1@hostela.com', name: 'Co-Admin 1', role: 'Admin', pin: '112233' },
  { email: 'coadmin2@hostela.com', name: 'Co-Admin 2', role: 'Admin', pin: '445566' }
];

export const ADMIN_EMAILS = ADMINS.map(a => a.email);
export const ADMIN_WHATSAPP = '923001112222'; // Primary Admin Contact

export const mockOwners: User[] = [
  {
    id: 'owner1',
    email: 'owner1@example.com',
    name: 'Sajid Khan',
    role: 'Owner',
    isApproved: true,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sajid'
  },
  {
    id: 'owner2',
    email: 'owner2@example.com',
    name: 'Zia Ahmed',
    role: 'Owner',
    isApproved: false, // New owner waiting for admin
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zia'
  }
];

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
  { id: 'r1', hostelId: '1', rating: 5, comment: 'Best food quality in this area.', date: '2023-10-12', isVerified: true, studentName: 'Ahmed K.' },
  { id: 'r2', hostelId: '1', rating: 4, comment: 'Staff is very helpful.', date: '2023-11-01', isVerified: true, studentName: 'Sara L.' }
];

export const isAdmin = (email: string) => ADMIN_EMAILS.includes(email.toLowerCase());
