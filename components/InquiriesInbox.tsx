import { Mail } from 'lucide-react';
import { Inquiry, InquiryStatus } from '../types';
import { Button } from './Button';

interface Props {
  inquiries: Inquiry[];
  onStatus: (id: string, status: InquiryStatus) => void;
}

// Owner/admin inquiries inbox for the dashboard (extracted in Phase 3).
export function InquiriesInbox({ inquiries, onStatus }: Props) {
  if (inquiries.length === 0) return null;
  return (
                
                  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-100 shadow-xl shadow-blue-50">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="bg-blue-100 p-2 rounded-xl">
                        <Mail className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-gray-900">Student Inquiries</h3>
                        <p className="text-sm text-gray-500 font-medium">{inquiries.length} total — contact the student, then mark the stay once they move in to unlock their review.</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {inquiries.map(inq => (
                        <div key={inq.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-bold text-gray-900">{inq.studentName} <span className="text-gray-400 font-medium">→ {inq.hostelName}</span></p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(inq.createdAt).toLocaleDateString()}{inq.studentPhone ? ` • ${inq.studentPhone}` : ''}{inq.moveIn ? ` • Move-in: ${inq.moveIn}` : ''}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              inq.status === 'new' ? 'bg-yellow-100 text-yellow-700' :
                              inq.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                              inq.status === 'stayed' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                            }`}>{inq.status}</span>
                          </div>
                          <p className="text-sm text-gray-600 italic">"{inq.message}"</p>
                          {inq.status !== 'closed' && (
                            <div className="flex flex-wrap gap-2">
                              {inq.status === 'new' && <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => onStatus(inq.id, 'contacted')}>Mark Contacted</Button>}
                              {inq.status !== 'stayed' && <Button size="sm" className="rounded-xl" onClick={() => onStatus(inq.id, 'stayed')}>Mark Stayed</Button>}
                              {inq.status === 'stayed' && <span className="text-[10px] font-black text-green-600 uppercase tracking-widest self-center">Stay confirmed — this student can now review</span>}
                              <Button size="sm" variant="danger" className="rounded-xl" onClick={() => onStatus(inq.id, 'closed')}>Close</Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
  );
}
