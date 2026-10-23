import React, { useState } from 'react';
import { ShieldCheck, LayoutDashboard, Mail, LogOut, Plus, X, Menu } from 'lucide-react';
import { Language, TranslationSet, User, View } from '../types';
import { Button } from './Button';

interface Props {
  lang: Language;
  onLangChange: (lang: Language) => void;
  user: User | null;
  t: TranslationSet;
  onNavigate: (view: View) => void;
  onLogout: () => void;
}

// Top navigation bar (extracted from App.tsx in Phase 3). The mobile menu
// open/close state lives here — it is only used by this component.
export function Navbar({ lang, onLangChange, user, t, onNavigate, onLogout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const handleLogout = () => { setMenuOpen(false); onLogout(); };
  return (
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onNavigate('home')}>
            <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Hostela</h1>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <select value={lang} onChange={(e) => onLangChange(e.target.value as Language)} className="bg-transparent border-none text-sm font-semibold focus:ring-0 cursor-pointer">
              <option value="en">EN</option>
              <option value="ur">اردو</option>
              <option value="ar">AR</option>
            </select>
            {user ? (
              <div className="flex items-center gap-3">
                {user.role !== 'Student' && (
                  <Button variant="ghost" size="sm" onClick={() => onNavigate(user.role === 'Admin' ? 'admin-dashboard' : 'owner-dashboard')} className="gap-2 text-xs">
                    <LayoutDashboard className="w-3 h-3" /> Dashboard
                  </Button>
                )}
                {user.role === 'Student' && (
                  <Button variant="ghost" size="sm" onClick={() => onNavigate('my-inquiries')} className="gap-2 text-xs">
                    <Mail className="w-3 h-3" /> My Inquiries
                  </Button>
                )}
                <div className="flex items-center gap-3 bg-gray-50 pl-1 pr-3 py-1 rounded-full border border-gray-200">
                  <img src={user.avatar} className="w-8 h-8 rounded-full shadow-sm" alt="" />
                  <span className="text-sm font-bold truncate max-w-[100px]">{user.name}</span>
                  <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors"><LogOut className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onNavigate('login')}>Sign In</Button>
                <Button variant="primary" size="sm" onClick={() => onNavigate('signup')} className="gap-2">
                  <Plus className="w-4 h-4" /> Create Account
                </Button>
              </div>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b shadow-xl px-4 py-6 space-y-4 animate-in slide-in-from-top duration-200">
            <Button fullWidth variant="ghost" onClick={() => { onNavigate('home'); setMenuOpen(false); }}>Home</Button>
            <Button fullWidth variant="ghost" onClick={() => { onNavigate('add-hostel'); setMenuOpen(false); }}>{t.addHostel}</Button>
            <Button fullWidth variant="ghost" onClick={() => { onNavigate('signup'); setMenuOpen(false); }}>Create Account</Button>
            <div className="grid grid-cols-2 gap-4">
              <select value={lang} onChange={(e) => onLangChange(e.target.value as Language)} className="w-full border rounded-lg py-2 text-center font-bold">
                <option value="en">English</option>
                <option value="ur">اردو</option>
                <option value="ar">Arabic</option>
              </select>
              {user ? (
                <Button fullWidth variant="danger" onClick={handleLogout} className="gap-2"><LogOut className="w-4 h-4" /> Logout</Button>
              ) : (
                <Button fullWidth onClick={() => { onNavigate('login'); setMenuOpen(false); }}>Sign In</Button>
              )}
            </div>
          </div>
        )}
      </header>
  );
}
