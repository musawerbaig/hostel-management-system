import { Inquiry } from '../types';
import { Button } from './Button';

interface Props {
  inquiries: Inquiry[];
  onBrowse: () => void;
}

const STATUS_LABEL: Record<Inquiry['status'], string> = {
  new: 'Sent — waiting for owner',
  contacted: 'Owner contacted you',
  stayed: 'Stay confirmed — you can review!',
  closed: 'Closed',
};

// Student's inquiry tracker (extracted from App.tsx in Phase 3).
export function MyInquiriesView({ inquiries, onBrowse }: Props) {
  return (
          <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-500">
            <h2 className="text-4xl font-black text-gray-900 mb-2">My Inquiries</h2>
            <p className="text-gray-500 font-medium mb-10">Hostels you've contacted — and what happens next.</p>
            {inquiries.length === 0 ? (
              <div className="p-10 bg-white rounded-[2rem] border-2 border-dashed border-gray-200 text-center">
                <p className="font-bold text-gray-500 mb-4">You haven't sent any inquiries yet.</p>
                <Button onClick={onBrowse} className="rounded-xl px-8">Browse Hostels</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {inquiries.map(inq => (
                  <div key={inq.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-black text-gray-900 text-lg">{inq.hostelName}</p>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        inq.status === 'new' ? 'bg-yellow-100 text-yellow-700' :
                        inq.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                        inq.status === 'stayed' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {STATUS_LABEL[inq.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 italic">"{inq.message}"</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(inq.createdAt).toLocaleDateString()}{inq.moveInDate ? ` • Moving in: ${inq.moveInDate}` : ''} • {inq.bedsNeeded} bed(s)</p>
                  </div>
                ))}
              </div>
            )}
          </div>
  );
}
