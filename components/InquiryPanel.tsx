import React from 'react';
import { CheckCircle, MessageCircle, ShieldCheck } from 'lucide-react';
import { Hostel, User } from '../types';
import { Button } from './Button';

interface Props {
  hostel: Hostel;
  user: User | null;
  sent: boolean;
  busy: boolean;
  message: string;
  onMessageChange: (v: string) => void;
  phone: string;
  onPhoneChange: (v: string) => void;
  moveIn: string;
  onMoveInChange: (v: string) => void;
  onSubmitInquiry: (e: React.FormEvent) => void;
  onSignIn: () => void;
}

// Sticky booking-card column on the listing page (extracted in Phase 3):
// rent, the Phase 2 inquiry form, and the owner's WhatsApp as a fallback.
export function InquiryPanel({ hostel, user, sent, busy, message, onMessageChange, phone, onPhoneChange, moveIn, onMoveInChange, onSubmitInquiry, onSignIn }: Props) {
  return (
    <div className="space-y-6">
<div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-2xl sticky top-24">
                        <div className="space-y-1 mb-8">
                           <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Starting Rent</p>
                           <h3 className="text-4xl font-black text-blue-600 tracking-tighter">Rs. {hostel.minRent.toLocaleString()}</h3>
                        </div>
                        <div className="space-y-4">
                           {user && user.id === hostel.ownerId ? (
                             <div className="p-4 bg-blue-50 rounded-2xl text-center">
                               <p className="text-xs font-bold text-blue-800 leading-relaxed">This is your listing. Student inquiries for it arrive in your dashboard.</p>
                             </div>
                           ) : sent ? (
                             <div className="p-5 bg-green-50 border border-green-100 rounded-2xl text-center space-y-2">
                               <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                               <p className="font-black text-green-800">Inquiry sent!</p>
                               <p className="text-xs font-bold text-green-600 leading-relaxed">The owner has your message and can contact you. Track replies under My Inquiries.</p>
                             </div>
                           ) : user ? (
                             <form className="space-y-3" onSubmit={onSubmitInquiry}>
                               <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Send an inquiry to the owner</p>
                               <textarea
                                 required
                                 rows={3}
                                 className="w-full p-4 rounded-2xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                 placeholder="Hi! I'm looking for a bed — is one available?"
                                 value={message}
                                 onChange={(e) => onMessageChange(e.target.value)}
                               />
                               <input
                                 type="tel"
                                 className="w-full p-4 rounded-2xl bg-gray-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                 placeholder="Your phone / WhatsApp (optional)"
                                 value={phone}
                                 onChange={(e) => onPhoneChange(e.target.value)}
                               />
                               <input
                                 type="text"
                                 className="w-full p-4 rounded-2xl bg-gray-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                 placeholder="Planning to move in — e.g. Nov 2026 (optional)"
                                 value={moveIn}
                                 onChange={(e) => onMoveInChange(e.target.value)}
                               />
                               <Button fullWidth size="lg" disabled={busy} className="rounded-2xl py-5 shadow-xl shadow-blue-100">
                                 {busy ? 'Sending…' : 'Send Inquiry'}
                               </Button>
                             </form>
                           ) : (
                             <div className="text-center space-y-3">
                               <p className="text-sm font-bold text-gray-500">Sign in to send an inquiry directly to the owner.</p>
                               <Button fullWidth size="lg" className="rounded-2xl py-5" onClick={onSignIn}>Sign In to Inquire</Button>
                             </div>
                           )}
                           {hostel.whatsappNumber && user?.id !== hostel.ownerId && (
                             <a href={`https://wa.me/${hostel.whatsappNumber}`} target="_blank" rel="noreferrer" className="block">
                               <Button fullWidth variant="outline" size="lg" className="rounded-2xl py-4 flex gap-2">
                                 <MessageCircle className="w-5 h-5" /> WhatsApp the owner
                               </Button>
                             </a>
                           )}
                           <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                             <ShieldCheck className="w-6 h-6 text-blue-600 flex-shrink-0" />
                             <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed tracking-wider">Inquiries go directly to the owner. Never pay in advance — visit first, then decide.</p>
                           </div>
                        </div>
                     </div>

    </div>
  );
}
