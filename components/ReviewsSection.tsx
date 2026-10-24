import { Star, CheckCircle } from 'lucide-react';
import React from 'react';
import { Hostel, Inquiry, Review, TranslationSet, User } from '../types';
import { Button } from './Button';

interface Props {
  hostel: Hostel;
  reviews: Review[];
  t: TranslationSet;
  user: User | null;
  stayedInquiry?: Inquiry;
  myReview?: Review;
  reviewRating: number;
  onRatingChange: (rating: number) => void;
  reviewComment: string;
  onCommentChange: (comment: string) => void;
  onSubmitReview: (e: React.FormEvent) => void;
  onSignIn: () => void;
}

// Reviews card on the listing page (extracted from App.tsx in Phase 3).
// The form only renders for a student whose stay the owner confirmed —
// the same gate firestore.rules enforces server-side.
export function ReviewsSection({ hostel, reviews, t, user, stayedInquiry, myReview, reviewRating, onRatingChange, reviewComment, onCommentChange, onSubmitReview, onSignIn }: Props) {
  return (
<div className="bg-white p-8 md:p-10 rounded-[2rem] border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                           <h2 className="text-xl font-black text-gray-900">{t.reviews}</h2>
                           <span className="text-xs font-bold text-gray-400 italic">{t.adminNote}</span>
                        </div>
                        <div className="space-y-6">
                           {reviews.filter(r => r.hostelId === hostel.id && r.status === 'visible').map(r => (
                             <div key={r.id} className="p-6 bg-gray-50 rounded-2xl relative overflow-hidden group">
                                <div className="flex justify-between items-center mb-3">
                                   <div className="flex gap-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
                                      ))}
                                   </div>
                                   <span className="text-[10px] font-bold text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-gray-700 italic mb-4 leading-relaxed">"{r.comment}"</p>
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-3 h-3 text-blue-500" />
                                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{r.studentName || 'Verified Resident'}</span>
                                </div>
                             </div>
                           ))}
                        </div>
                        
                        {myReview ? (
                          <div className="mt-10 p-8 bg-green-50 rounded-[2rem] border border-green-100 text-center space-y-2">
                            <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                            <p className="font-black text-green-800">You've reviewed this hostel</p>
                            <p className="text-xs font-bold text-green-600">Thanks — your verified review is shown above.</p>
                          </div>
                        ) : stayedInquiry ? (
                          <form className="mt-10 p-8 bg-blue-50 rounded-[2rem] space-y-4 border border-blue-100" onSubmit={onSubmitReview}>
                            <h3 className="font-black text-blue-900">Post a Verified Review</h3>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`w-8 h-8 cursor-pointer transition-all ${reviewRating >= s ? 'text-yellow-400 fill-current' : 'text-gray-200 hover:scale-110'}`} onClick={() => onRatingChange(s)} />
                              ))}
                            </div>
                            <textarea
                              className="w-full p-5 rounded-2xl border-none text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                              rows={4}
                              placeholder="Describe your stay experience..."
                              value={reviewComment}
                              onChange={(e) => onCommentChange(e.target.value)}
                            />
                            <Button fullWidth size="lg" className="rounded-2xl">Submit Review</Button>
                          </form>
                        ) : user?.role === 'student' ? (
                          <div className="mt-10 p-8 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-[2rem] text-center">
                            <p className="text-sm font-black text-blue-900 mb-2">Reviews unlock after your stay</p>
                            <p className="text-xs font-medium text-blue-700 leading-relaxed">Send an inquiry from this page — once the owner confirms you stayed here, you can post a verified review. That's how Hostela keeps reviews honest.</p>
                          </div>
                        ) : (
                          <div className="mt-10 p-8 border-2 border-dashed border-gray-200 rounded-[2rem] text-center">
                            <p className="text-sm font-bold text-gray-500 mb-4">{t.studentLogin}</p>
                            <Button variant="outline" size="sm" onClick={onSignIn} className="rounded-xl px-8 flex items-center gap-2 mx-auto">
                              Sign in to write a review
                            </Button>
                          </div>
                        )}
                     </div>
  );
}
