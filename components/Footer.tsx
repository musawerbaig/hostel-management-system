import { Globe, Mail, MessageCircle, ShieldCheck } from 'lucide-react';

interface Props {
  onSignIn: () => void;
}

// Site footer (extracted from App.tsx in Phase 3).
export function Footer({ onSignIn }: Props) {
  return (
      <footer className="bg-white border-t border-gray-100 py-16 px-4 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 items-center text-center md:text-left">
          <div className="space-y-4">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="bg-blue-600 p-1 rounded-md">
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tighter">Hostela</h2>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed font-medium">Pakistan's first student-focused hostel marketplace built on trust and direct moderation.</p>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">Official Channels</p>
            <div className="flex gap-4">
               <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors shadow-sm"><Globe className="w-5 h-5" /></a>
               <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors shadow-sm"><Mail className="w-5 h-5" /></a>
            </div>
          </div>

          <div className="space-y-4 md:text-right">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">© 2026 Hostela — Verified Student Marketplace</p>
            <div className="flex justify-center md:justify-end gap-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <button type="button" className="hover:text-blue-600 transition-colors">Privacy</button>
              <button type="button" className="hover:text-blue-600 transition-colors">Terms</button>
              <button 
                type="button" 
                className="hover:text-blue-600 transition-colors font-bold text-gray-600" 
                onClick={(e) => { e.preventDefault(); onSignIn(); }}
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </footer>
  );
}
