import React from 'react';
import { CheckCircle, ShieldCheck } from 'lucide-react';
import type { Hostel, User } from '../types';
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
  bedsNeeded: number;
  onBedsChange: (v: number) => void;
  ownerPhone: string;
  onSubmitInquiry: (e: React.FormEvent) => void;
  onSignIn: () => void;
}

// Sticky inquiry card on the listing page — PRD §7.2: phone is required
// (the owner's reply channel), move-in is a date, beds needed is explicit,
// message is optional. The owner's phone is revealed ONLY in the
// confirmation after an inquiry is sent (PRD §11), never before.
export function InquiryPanel({
  hostel, user, sent, busy, message, onMessageChange,
  phone, onPhoneChange, moveIn, onMoveInChange,
  bedsNeeded, onBedsChange, ownerPhone, onSubmitInquiry, onSignIn,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-2xl sticky top-24">
        <div className="space-y-1 mb-8">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Per bed / month</p>
          <h3 className="text-4xl font-black text-blue-600 tracking-tighter">Rs. {hostel.pricePerBedMonthly.toLocaleString()}</h3>
          <p className="text-xs font-bold text-gray-500">
            {hostel.messAvailable ? `Mess Rs. ${hostel.messPriceMonthly.toLocaleString()}/month • ` : 'No mess • '}
            Deposit Rs. {hostel.securityDeposit.toLocaleString()}
          </p>
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
              {ownerPhone ? (
                <p className="text-xs font-bold text-green-700 leading-relaxed pt-1">
                  Owner's phone: <a className="underline" href={`https://wa.me/${ownerPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{ownerPhone}</a> — mention your Hostela inquiry. The owner confirms availability directly; never pay in advance.
                </p>
              ) : (
                <p className="text-xs font-bold text-green-600 leading-relaxed">The owner will reach you on the phone number you provided.</p>
              )}
            </div>
          ) : user ? (
            <form className="space-y-3" onSubmit={onSubmitInquiry}>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Send an inquiry to the owner</p>
              <input
                type="tel"
                required
                className="w-full p-4 rounded-2xl bg-gray-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Your phone number (required)"
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  required
                  aria-label="Move-in date"
                  className="w-full p-4 rounded-2xl bg-gray-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  value={moveIn}
                  onChange={(e) => onMoveInChange(e.target.value)}
                />
                <input
                  type="number"
                  min={1}
                  required
                  aria-label="Beds needed"
                  className="w-full p-4 rounded-2xl bg-gray-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Beds"
                  value={bedsNeeded}
                  onChange={(e) => onBedsChange(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <textarea
                rows={3}
                className="w-full p-4 rounded-2xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Message (optional) — e.g. Hi! I'm looking for a bed, is one available?"
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
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
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
            <ShieldCheck className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed tracking-wider">Inquiries go directly to the owner. Never pay in advance — visit first, then decide.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
