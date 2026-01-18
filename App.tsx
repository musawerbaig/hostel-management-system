import { db } from './firebase'; 
import { collection, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { translations } from './translations';
import { Language, User, Hostel, Review, Gender, Room } from './types';
import { mockHostels, mockReviews, ADMINS, ADMIN_WHATSAPP, mockOwners } from './store';
import { Button } from './components/Button';
import { 
  Search, 
  ShieldCheck, 
  MapPin, 
  Star, 
  Plus, 
  LogOut, 
  Globe, 
  X, 
  Trash2,
  Phone,
  Settings,
  Mail,
  DollarSign,
  ChevronLeft,
  Camera,
  Users,
  Menu,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  Shield,
  Zap,
  Info,
  Key,
  ExternalLink,
  Image as ImageIcon,
  Upload,
  LayoutDashboard
} from 'lucide-react';

export default function App() {
  const [newName, setNewName] = useState('');
const [newCity, setNewCity] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
  const [lang, setLang] = useState<Language>('en');
  const [user, setUser] = useState<User | null>(null);
  const [hostels, setHostels] = useState<Hostel[]>(mockHostels);
  // This pulls live data from your Firebase
  useEffect(() => {
    const getLiveHostels = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "hostels"));
        const liveData: Hostel[] = querySnapshot.docs.map(doc => ({
  id: doc.id,
  ...(doc.data() as Omit<Hostel, 'id'>),
}));

        
        // If you have real data, show it. Otherwise, keep the mock data for now.
        // This ensures that even if you have mock data, 
// the live data from Firebase takes priority for the admin
if (liveData.length > 0) {
  setHostels(liveData);
}
      } catch (error) {
        console.error("Error fetching from Firebase:", error);
      }
    };
    getLiveHostels();
  }, []);
  const [owners, setOwners] = useState<User[]>(mockOwners);
  const [reviews, setReviews] = useState<Review[]>(mockReviews);
  const [view, setView] = useState<'home' | 'details' | 'owner-dashboard' | 'admin-dashboard' | 'add-hostel' | 'admin-login' | 'edit-hostel'>('home');
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Hostel Edit State
  const [editHostelData, setEditHostelData] = useState<Hostel | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<Gender | 'All'>('All');
  const [maxRentFilter, setMaxRentFilter] = useState<number>(100000);

  // Admin Login States (Stricter MFA)
  const [adminLoginStep, setAdminLoginStep] = useState<'email' | 'mfa'>('email');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPinInput, setAdminPinInput] = useState('');
  const [activeAdminProfile, setActiveAdminProfile] = useState<any>(null);
  const [adminLoginError, setAdminLoginError] = useState('');
  
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Image Upload State (Simulated for Firebase integration)
  const [tempUploadedImages, setTempUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  const getAvgRating = (hostelId: string) => {
    const hostelReviews = reviews.filter(r => r.hostelId === hostelId);
    if (hostelReviews.length === 0) return 'New';
    const sum = hostelReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / hostelReviews.length).toFixed(1);
  };

  const handleOwnerLogin = () => {
    setUser(owners[0]);
    setView('owner-dashboard');
    setIsMobileMenuOpen(false);
  };

  const handleStudentLogin = () => {
    const mockStudent: User = {
      id: 'std_' + Date.now(),
      email: 'student@gmail.com',
      name: 'Verified Student',
      role: 'Student',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student'
    };
    setUser(mockStudent);
    setIsMobileMenuOpen(false);
  };

  const handleOwnerRegister = () => {
    const mockNewOwner: User = {
      id: 'owner_' + Date.now(),
      email: 'newowner@gmail.com',
      name: 'Hostel Partner',
      role: 'Owner',
      isApproved: false,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=partner`
    };
    setUser(mockNewOwner);
    setOwners(prev => [...prev, mockNewOwner]);
    setView('owner-dashboard');
    setIsMobileMenuOpen(false);
  };

  const handleAdminEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = adminEmailInput.trim().toLowerCase();
    const admin = ADMINS.find(a => a.email.toLowerCase() === email);
    if (admin) {
      setActiveAdminProfile(admin);
      setAdminLoginStep('mfa');
      setAdminLoginError('');
    } else {
      setAdminLoginError('Restricted Access: Unrecognized administrator email.');
    }
  };

  const handleAdminMFASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pin = adminPinInput.trim();
    if (activeAdminProfile && pin === activeAdminProfile.pin) {
      setUser({ 
        id: 'admin_' + activeAdminProfile.email,
        email: activeAdminProfile.email,
        name: activeAdminProfile.name,
        role: 'Admin',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeAdminProfile.email}`
      } as User);
      setView('admin-dashboard');
      setAdminLoginError('');
      setAdminLoginStep('email');
      setAdminEmailInput('');
      setAdminPinInput('');
      setActiveAdminProfile(null);
    } else {
      setAdminLoginError('Invalid Security PIN. Access denied.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('home');
    setIsMobileMenuOpen(false);
  };

  const filteredHostels = useMemo(() => {
    return hostels.filter(h => {
      const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           h.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGender = genderFilter === 'All' || h.gender === genderFilter;
      const matchesRent = h.minRent <= maxRentFilter;
      return matchesSearch && matchesGender && matchesRent && h.status === 'approved';
    });
  }, [hostels, searchQuery, genderFilter, maxRentFilter]);

  const displayedHostels = user?.role === 'Admin' ? hostels : hostels.filter(h => h.ownerId === user?.id);

  const handleEditHostel = (hostel: Hostel) => {
    setEditHostelData({ ...hostel });
    setView('edit-hostel');
  };

  const saveHostelChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHostelData) return;
    setHostels(prev => prev.map(h => h.id === editHostelData.id ? editHostelData : h));
    alert("Listing updated successfully!");
    setView(user?.role === 'Admin' ? 'admin-dashboard' : 'owner-dashboard');
  };

  const toggleRoomAvailability = (roomId: string) => {
    if (!editHostelData) return;
    setEditHostelData({
      ...editHostelData,
      rooms: editHostelData.rooms.map(r => r.id === roomId ? { ...r, isAvailable: !r.isAvailable } : r)
    });
  };

  const addRoom = (number: string) => {
    if (!editHostelData || !number) return;
    const newRoom: Room = {
      id: 'room_' + Date.now(),
      number,
      isAvailable: true,
      capacity: 2,
      occupants: 0,
      photos: ['https://picsum.photos/seed/room/400/300']
    };
    setEditHostelData({ ...editHostelData, rooms: [...editHostelData.rooms, newRoom] });
  };

  const removeRoom = (roomId: string) => {
    if (!editHostelData) return;
    setEditHostelData({ ...editHostelData, rooms: editHostelData.rooms.filter(r => r.id !== roomId) });
  };

  const handleHostelStatusChange = async (id: string, newStatus: 'approved' | 'rejected') => {
  try {
    // 1. Find the specific document in Firebase
    const hostelRef = doc(db, "hostels", id);
    
    // 2. Update the status in the Cloud
    await updateDoc(hostelRef, { status: newStatus });
    
    // 3. Update the local screen so the hostel moves to the "Approved" list
    setHostels(prev => prev.map(h => h.id === id ? { ...h, status: newStatus } : h));
    
    alert(`Hostel has been ${newStatus}!`);
  } catch (error) {
    console.error("Admin Error:", error);
    alert("Failed to update status. Check your Firebase Rules.");
  }
};
  const handleDeleteHostel = (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this listing? This cannot be undone.")) {
      setHostels(prev => prev.filter(h => h.id !== id));
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files).map((file: File) => URL.createObjectURL(file));
      setTempUploadedImages(prev => [...prev, ...newImages]);
    }
  };

  const handleRoomImageSelect = (roomId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && editHostelData) {
      const newPhotos = Array.from(files).map((file: File) => URL.createObjectURL(file));
      setEditHostelData({
        ...editHostelData,
        rooms: editHostelData.rooms.map(r => 
          r.id === roomId ? { ...r, photos: [...r.photos, ...newPhotos] } : r
        )
      });
    }
  };

  const handleStudentAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHostel || !user || !reviewComment) return;
    const newReview: Review = {
      id: 'rev_' + Date.now(),
      hostelId: selectedHostel.id,
      rating: reviewRating,
      comment: reviewComment,
      date: new Date().toISOString().split('T')[0],
      isVerified: true,
      studentName: user.name
    };
    setReviews(prev => [newReview, ...prev]);
    setReviewComment('');
    alert("Thank you for your review!");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] text-gray-900 selection:bg-blue-100" dir={lang === 'ur' || lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('home')}>
            <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Hostela</h1>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <select value={lang} onChange={(e) => setLang(e.target.value as Language)} className="bg-transparent border-none text-sm font-semibold focus:ring-0 cursor-pointer">
              <option value="en">EN</option>
              <option value="ur">اردو</option>
              <option value="ar">AR</option>
            </select>
            {user ? (
              <div className="flex items-center gap-3">
                {user.role !== 'Student' && (
                  <Button variant="ghost" size="sm" onClick={() => setView(user.role === 'Admin' ? 'admin-dashboard' : 'owner-dashboard')} className="gap-2 text-xs">
                    <LayoutDashboard className="w-3 h-3" /> Dashboard
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
                <Button variant="outline" size="sm" onClick={handleOwnerLogin}>Owner Login</Button>
                <Button variant="primary" size="sm" onClick={() => setView('add-hostel')} className="gap-2">
                  <Plus className="w-4 h-4" /> Add Hostel
                </Button>
              </div>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b shadow-xl px-4 py-6 space-y-4 animate-in slide-in-from-top duration-200">
            <Button fullWidth variant="ghost" onClick={() => { setView('home'); setIsMobileMenuOpen(false); }}>Home</Button>
            <Button fullWidth variant="ghost" onClick={() => { setView('add-hostel'); setIsMobileMenuOpen(false); }}>{t.addHostel}</Button>
            <Button fullWidth variant="ghost" onClick={() => { setView('admin-login'); setIsMobileMenuOpen(false); }}>Admin Access</Button>
            <div className="grid grid-cols-2 gap-4">
              <select value={lang} onChange={(e) => setLang(e.target.value as Language)} className="w-full border rounded-lg py-2 text-center font-bold">
                <option value="en">English</option>
                <option value="ur">اردو</option>
                <option value="ar">Arabic</option>
              </select>
              {user ? (
                <Button fullWidth variant="danger" onClick={handleLogout} className="gap-2"><LogOut className="w-4 h-4" /> Logout</Button>
              ) : (
                <Button fullWidth onClick={handleOwnerLogin}>Partner Login</Button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {view === 'home' && (
          <div className="animate-in fade-in duration-500">
            {/* Hero */}
            <section className="relative pt-20 pb-16 px-4 bg-gradient-to-b from-blue-50 to-white overflow-hidden">
              <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-black uppercase tracking-widest">
                  <ShieldCheck className="w-4 h-4" /> Trusted by Students
                </div>
                <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
                  {t.welcome}
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Simple, verified, and secure student hostels across Pakistan. Connect directly with Hostela Admins for guaranteed placement.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                  <Button size="lg" className="rounded-2xl shadow-xl shadow-blue-200 px-10" onClick={() => {
                    const el = document.getElementById('search-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}>Browse Listings</Button>
                  <Button size="lg" variant="outline" className="rounded-2xl border-2 px-10 flex gap-2" onClick={() => setView('add-hostel')}>
                    <Plus className="w-5 h-5" /> Add Your Hostel
                  </Button>
                </div>
              </div>
            </section>

            {/* Search & Filters */}
            <section id="search-section" className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
              <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-2xl shadow-gray-200 border border-gray-100 space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-grow relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                      type="text" 
                      placeholder={t.searchHostels} 
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-base outline-none font-medium"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 md:flex gap-4">
                    <select 
                      className="flex-grow md:min-w-[180px] p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      value={genderFilter}
                      onChange={(e) => setGenderFilter(e.target.value as Gender | 'All')}
                    >
                      <option value="All">All Genders</option>
                      <option value="Boys">{t.boys}</option>
                      <option value="Girls">{t.girls}</option>
                      <option value="Co-Living">{t.coLiving}</option>
                    </select>
                    <Button variant="outline" className="md:hidden rounded-2xl" onClick={() => {}}>
                      <Info className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-black uppercase text-gray-400 tracking-widest">{t.rentRange}</label>
                    <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Up to PKR {maxRentFilter.toLocaleString()}</span>
                  </div>
                  <input 
                    type="range" min="5000" max="100000" step="1000" 
                    value={maxRentFilter} onChange={(e) => setMaxRentFilter(Number(e.target.value))}
                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-gray-300 mt-2 uppercase">
                    <span>PKR 5k</span>
                    <span>PKR 100k+</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Grid */}
            <section className="max-w-7xl mx-auto px-4 py-16">
              {filteredHostels.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredHostels.map(h => (
                    <article 
                      key={h.id} 
                      className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
                      onClick={() => { setSelectedHostel(h); setView('details'); window.scrollTo(0,0); }}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img src={h.photos[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={h.name} />
                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
                            h.gender === 'Boys' ? 'bg-blue-600 text-white' : 
                            h.gender === 'Girls' ? 'bg-pink-500 text-white' : 'bg-purple-600 text-white'
                          }`}>
                            {h.gender}
                          </span>
                        </div>
                        <div className="absolute bottom-4 left-4">
                          <span className="px-3 py-1 bg-white/90 backdrop-blur text-[10px] font-black text-gray-900 rounded-full flex items-center gap-1 shadow-sm">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" /> {getAvgRating(h.id)}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 flex-grow flex flex-col space-y-3">
                        <div className="flex justify-between items-start">
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{h.name}</h3>
                        </div>
                        <p className="flex items-center gap-1 text-gray-500 text-sm">
                          <MapPin className="w-4 h-4 text-gray-400" /> {h.city} • {h.address.split(',')[0]}
                        </p>
                        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Monthly Start</span>
                            <span className="text-2xl font-black text-gray-900">Rs. {h.minRent.toLocaleString()}</span>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <ChevronLeft className="w-5 h-5 rotate-180" />
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-gray-200">
                  <AlertCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-400">No Hostels Found</h3>
                  <p className="text-gray-400 mt-2">Try adjusting your budget or search terms.</p>
                  <Button variant="ghost" className="mt-4" onClick={() => { setSearchQuery(''); setGenderFilter('All'); setMaxRentFilter(100000); }}>Clear Filters</Button>
                </div>
              )}
            </section>

            {/* Why Hostela? Section */}
            <section className="bg-gray-900 text-white py-24 px-4 overflow-hidden relative">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                  <h2 className="text-3xl md:text-5xl font-black leading-tight">Extra Things You Should Know About <span className="text-blue-500">Hostela</span></h2>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Shield className="text-blue-500" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold">100% Moderated Listings</h4>
                        <p className="text-gray-400 text-sm">No random postings. Every hostel is manually verified by our admins before it appears online.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Zap className="text-blue-500" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold">Direct Admin Booking</h4>
                        <p className="text-gray-400 text-sm">We handle the communication. Our HQ contact ensures you get the real room at the right price.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="text-blue-500" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold">Verified Student Voices</h4>
                        <p className="text-gray-400 text-sm">Reviews are collected directly from actual residents to maintain zero bias and complete transparency.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="bg-blue-600/10 rounded-[3rem] p-8 border border-white/10 backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xl">H</div>
                      <div>
                        <p className="font-bold">Hostela Assurance</p>
                        <p className="text-xs text-blue-400">Trusted Partner Program</p>
                      </div>
                    </div>
                    <p className="text-gray-300 italic mb-6">"Our goal is to eliminate the stress of finding student accommodation. By centralizing booking through our verified HQ, we protect both students and parents from scams."</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-green-500 w-5 h-5" />
                      <span className="text-sm font-bold">Official Marketplace Certification</span>
                    </div>
                  </div>
                  {/* Decorative blobs */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl"></div>
                </div>
              </div>
            </section>
          </div>
        )}

        {view === 'details' && selectedHostel && (
          <div className="max-w-4xl mx-auto py-8 px-4 animate-in slide-in-from-bottom duration-500">
            <button className="mb-8 flex items-center gap-1 text-sm font-black text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest" onClick={() => setView('home')}>
              <ChevronLeft className="w-5 h-5" /> {t.searchHostels}
            </button>
            
            <div className="space-y-10">
               <div className="aspect-[16/9] md:aspect-[21/9] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-white">
                  <img src={selectedHostel.photos[0]} className="w-full h-full object-cover" alt="" />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="md:col-span-2 space-y-10">
                     <div className="bg-white p-8 md:p-10 rounded-[2rem] border border-gray-100 shadow-sm">
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">{t.verified}</span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full">{selectedHostel.gender}</span>
                        </div>
                        <h2 className="text-3xl font-black mb-6 text-gray-900">{selectedHostel.name}</h2>
                        <p className="text-gray-600 leading-relaxed text-lg">{selectedHostel.description}</p>
                        
                        <div className="grid grid-cols-2 gap-8 mt-10 pt-10 border-t border-gray-50">
                           <div className="space-y-1">
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.admissionCharges}</p>
                              <p className="text-xl font-black text-gray-900">PKR {selectedHostel.admissionCharges.toLocaleString()}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.securityFee}</p>
                              <p className="text-xl font-black text-gray-900">PKR {selectedHostel.securityFee.toLocaleString()}</p>
                           </div>
                        </div>
                     </div>

                     <div className="bg-white p-8 md:p-10 rounded-[2rem] border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-black mb-8 text-gray-900">{t.availability}</h2>
                        <div className="grid grid-cols-1 gap-6">
                           {selectedHostel.rooms.map(room => (
                             <div key={room.id} className="p-5 bg-gray-50 rounded-2xl flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm font-black text-blue-600">
                                        #{room.number}
                                     </div>
                                     <div>
                                        <p className="font-bold text-gray-900">Capacity: {room.capacity} Persons</p>
                                        <p className="text-xs text-gray-500">{room.occupants} Current Residents</p>
                                     </div>
                                  </div>
                                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    room.isAvailable ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-gray-200 text-gray-400'
                                  }`}>
                                     {room.isAvailable ? 'Available Now' : 'Occupied'}
                                  </span>
                                </div>
                                
                                {/* Room Photos Section */}
                                {room.photos.length > 0 && (
                                  <div className="flex gap-2 overflow-x-auto pb-2 pt-2 snap-x scrollbar-hide">
                                    {room.photos.map((p, idx) => (
                                      <div key={idx} className="flex-shrink-0 w-32 h-24 rounded-xl overflow-hidden border-2 border-white shadow-sm snap-center">
                                        <img src={p} className="w-full h-full object-cover" alt={`Room ${room.number}`} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                             </div>
                           ))}
                        </div>
                     </div>

                     {selectedHostel.mapUrl && (
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                           <div className="flex items-center justify-between">
                              <h2 className="text-xl font-black text-gray-900">Exact Location</h2>
                              <a 
                                href={selectedHostel.mapUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs font-black text-blue-600 bg-blue-50 px-3 py-2 rounded-xl hover:bg-blue-100 transition-all"
                              >
                                <ExternalLink className="w-3 h-3" /> View on Maps
                              </a>
                           </div>
                           <div className="aspect-video rounded-[1.5rem] overflow-hidden border-2 border-gray-50">
                              <iframe 
                                src={selectedHostel.mapUrl?.includes('embed') ? selectedHostel.mapUrl : `https://www.google.com/maps/embed?pb=PLACEHOLDER`} 
                                width="100%" 
                                height="100%" 
                                className="border-none" 
                                loading="lazy"
                              ></iframe>
                           </div>
                        </div>
                     )}

                     <div className="bg-white p-8 md:p-10 rounded-[2rem] border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                           <h2 className="text-xl font-black text-gray-900">{t.reviews}</h2>
                           <span className="text-xs font-bold text-gray-400 italic">{t.adminNote}</span>
                        </div>
                        <div className="space-y-6">
                           {reviews.filter(r => r.hostelId === selectedHostel.id).map(r => (
                             <div key={r.id} className="p-6 bg-gray-50 rounded-2xl relative overflow-hidden group">
                                <div className="flex justify-between items-center mb-3">
                                   <div className="flex gap-0.5">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
                                      ))}
                                   </div>
                                   <span className="text-[10px] font-bold text-gray-400">{r.date}</span>
                                </div>
                                <p className="text-gray-700 italic mb-4 leading-relaxed">"{r.comment}"</p>
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-3 h-3 text-blue-500" />
                                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{r.studentName || 'Anonymous Resident'}</span>
                                </div>
                             </div>
                           ))}
                        </div>
                        
                        {user?.role === 'Student' ? (
                          <form className="mt-10 p-8 bg-blue-50 rounded-[2rem] space-y-4 border border-blue-100" onSubmit={handleStudentAddReview}>
                            <h3 className="font-black text-blue-900">Post a Verified Review</h3>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`w-8 h-8 cursor-pointer transition-all ${reviewRating >= s ? 'text-yellow-400 fill-current' : 'text-gray-200 hover:scale-110'}`} onClick={() => setReviewRating(s)} />
                              ))}
                            </div>
                            <textarea 
                              className="w-full p-5 rounded-2xl border-none text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium" 
                              rows={4}
                              placeholder="Describe your stay experience..."
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                            />
                            <Button fullWidth size="lg" className="rounded-2xl">Submit Review</Button>
                          </form>
                        ) : (
                          <div className="mt-10 p-8 border-2 border-dashed border-gray-200 rounded-[2rem] text-center">
                            <p className="text-sm font-bold text-gray-500 mb-4">{t.studentLogin}</p>
                            <Button variant="outline" size="sm" onClick={handleStudentLogin} className="rounded-xl px-8 flex items-center gap-2 mx-auto">
                              <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" className="w-4 h-4" />
                              Continue with Gmail
                            </Button>
                          </div>
                        )}
                     </div>
                  </div>

                  <div className="space-y-6">
                     <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-2xl sticky top-24">
                        <div className="space-y-1 mb-8">
                           <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Starting Rent</p>
                           <h3 className="text-4xl font-black text-blue-600 tracking-tighter">Rs. {selectedHostel.minRent.toLocaleString()}</h3>
                        </div>
                        <div className="space-y-4">
                           <a href={`https://wa.me/${ADMIN_WHATSAPP}`} target="_blank" className="block">
                              <Button 
  fullWidth 
  size="lg" 
  disabled={isSubmitting} // Disables button while saving
  className="rounded-2xl py-6 shadow-xl shadow-blue-100 text-lg flex gap-2" 
  onClick={async () => {
    try {
      if (!newName || !newCity) {
        alert("Please enter Name and City first!");
        return;
      }

      setIsSubmitting(true); // Start loading

      await addDoc(collection(db, "hostels"), {
        name: newName,
        city: newCity,
        status: 'pending',
        createdAt: new Date().toISOString(),
        ownerId: user?.id || 'guest_owner',
        photos: tempUploadedImages.length > 0 ? tempUploadedImages : ['https://picsum.photos/seed/hostel/800/600'],
        gender: 'Boys',
        minRent: 10000,
        rooms: []
      });

      alert("Listing submitted successfully to Firebase!");
      setNewName(''); 
      setNewCity(''); 
      setView('home');
    } catch (error) {
      console.error("Firebase Error:", error);
      alert("Error saving! Check your internet or Firebase Rules.");
    } finally {
      setIsSubmitting(false); // Stop loading regardless of success or error
    }
  }}
>
  {isSubmitting ? (
    <>
      <Zap className="w-5 h-5 animate-spin" /> Saving...
    </>
  ) : (
    "Submit for Verification"
  )}
</Button>
<Button 
  fullWidth 
  size="lg" 
  className="rounded-2xl py-6 shadow-xl shadow-blue-100 text-lg" 
  onClick={async () => {
    try {
      // Using the state variables (newName, newCity) instead of querySelector
      if (!newName || !newCity) {
        alert("Please enter Name and City first!");
        return;
      }

      await addDoc(collection(db, "hostels"), {
        name: newName,
        city: newCity,
        status: 'pending',
        createdAt: new Date().toISOString(),
        ownerId: user?.id || 'guest_owner',
        photos: tempUploadedImages.length > 0 ? tempUploadedImages : ['https://picsum.photos/seed/hostel/800/600'],
        gender: 'Boys',
        minRent: 10000,
        rooms: []
      });

      alert("Listing submitted successfully to Firebase!");
      setNewName(''); // Clears the input field after success
      setNewCity(''); // Clears the input field after success
      setView('home');
    } catch (error) {
      console.error("Firebase Error:", error);
      alert("Error saving! Ensure your Firebase Rules are set to 'true' in the browser.");
    }
  }}
>
  Submit for Verification
</Button>
                           </a>
                           <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                             <ShieldCheck className="w-6 h-6 text-blue-600 flex-shrink-0" />
                             <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed tracking-wider">Payments are processed only through verified Admin HQ for your safety.</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}

        {(view === 'owner-dashboard' || view === 'admin-dashboard') && (
           <div className="max-w-6xl mx-auto py-12 px-4 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                 <div>
                    <h2 className="text-4xl font-black text-gray-900">{user?.role === 'Admin' ? t.adminPortal : t.ownerPortal}</h2>
                    <p className="text-gray-500 mt-2 font-medium">Manage properties and room availability.</p>
                 </div>
                 <Button onClick={() => setView('add-hostel')} size="lg" className="rounded-2xl gap-2 shadow-xl shadow-blue-100"><Plus className="w-5 h-5" /> {t.addHostel}</Button>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {/* --- START OF VERIFICATION DASHBOARD MODIFICATION --- */}
{user?.role === 'Admin' && hostels.filter(h => h.status === 'pending').length > 0 && (
  <div className="mb-12 bg-white p-8 rounded-[2.5rem] border-2 border-yellow-100 shadow-xl shadow-yellow-50">
    <div className="flex items-center gap-3 mb-8">
      <div className="bg-yellow-100 p-2 rounded-xl">
        <AlertCircle className="w-6 h-6 text-yellow-600" />
      </div>
      <div>
        <h3 className="text-xl font-black text-gray-900">Pending Verifications</h3>
        <p className="text-sm text-gray-500 font-medium">These properties are waiting for your approval to go live.</p>
      </div>
    </div>

    <div className="space-y-4">
      {hostels.filter(h => h.status === 'pending').map(h => (
        <div key={h.id} className="p-5 bg-gray-50 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 border border-gray-100">
          <div className="flex items-center gap-4">
            <img src={h.photos[0]} className="w-16 h-16 rounded-xl object-cover" alt="" />
            <div>
              <p className="font-bold text-gray-900">{h.name}</p>
              <p className="text-xs text-gray-400 uppercase font-black tracking-widest">{h.city} • {h.gender}</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button 
              fullWidth 
              variant="secondary" 
              className="rounded-xl" 
              onClick={() => handleHostelStatusChange(h.id, 'approved')}
            >
              Approve
            </Button>
            <Button 
              fullWidth 
              variant="danger" 
              className="rounded-xl" 
              onClick={() => handleHostelStatusChange(h.id, 'rejected')}
            >
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
{/* --- END OF VERIFICATION DASHBOARD MODIFICATION --- */}
                 {displayedHostels.map(h => (

                   <div key={h.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8 items-start group">
                      <div className="w-full md:w-64 aspect-square overflow-hidden rounded-[2rem] border shadow-inner">
                        <img src={h.photos[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                      </div>
                      <div className="flex-grow space-y-6 w-full">
                         <div className="flex justify-between items-start">
                            <div className="space-y-1">
                               <div className="flex items-center gap-2">
                                  <h3 className="text-2xl font-black text-gray-900">{h.name}</h3>
                                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                    h.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                    h.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                  }`}>{h.status}</span>
                               </div>
                               <p className="text-xs text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                 <MapPin className="w-3 h-3" /> {h.city} • {h.gender}
                               </p>
                            </div>
                            <div className="flex gap-2">
                               {user?.role === 'Admin' && (
                                 <>
                                   {h.status === 'pending' && (
                                      <>
                                         <Button size="sm" variant="secondary" onClick={() => handleHostelStatusChange(h.id, 'approved')}>{t.approve}</Button>
                                         <Button size="sm" variant="danger" onClick={() => handleHostelStatusChange(h.id, 'rejected')}>{t.reject}</Button>
                                      </>
                                   )}
                                   <Button size="sm" variant="danger" onClick={() => handleDeleteHostel(h.id)} className="rounded-xl px-4"><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
                                 </>
                               )}
                               <Button size="sm" variant="outline" onClick={() => handleEditHostel(h)} className="rounded-xl px-4"><Settings className="w-4 h-4 mr-1" /> Edit</Button>
                            </div>
                         </div>
                         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                               <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Total Rooms</p>
                               <p className="text-lg font-black text-gray-900">{h.rooms.length}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                               <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Available</p>
                               <p className="text-lg font-black text-green-600">{h.rooms.filter(r => r.isAvailable).length}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                               <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Min Rent</p>
                               <p className="text-lg font-black text-blue-600">Rs. {h.minRent.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                               <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Security</p>
                               <p className="text-lg font-black text-gray-900">Rs. {h.securityFee.toLocaleString()}</p>
                            </div>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {view === 'edit-hostel' && editHostelData && (
           <div className="max-w-4xl mx-auto py-12 px-4 animate-in slide-in-from-right duration-500">
              <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-2xl relative">
                 <div className="flex items-center justify-between mb-12">
                    <h2 className="text-3xl font-black text-gray-900">Manage Property</h2>
                    <button className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors" onClick={() => setView(user?.role === 'Admin' ? 'admin-dashboard' : 'owner-dashboard')}>
                      <X className="w-6 h-6" />
                    </button>
                 </div>

                 {/* Restrictions Info for Owners */}
                 {user?.role === 'Owner' && (
                    <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                       <Info className="w-5 h-5 text-blue-600" />
                       <p className="text-xs font-bold text-blue-800">You can only edit room availability and room photos for verified listings.</p>
                    </div>
                 )}
                 
                 <form className="space-y-12" onSubmit={saveHostelChanges}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Hostel Name</label>
                          <input 
                            type="text" 
                            className={`w-full p-4 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none ${
                              user?.role === 'Owner' 
                                ? 'bg-gray-100 opacity-70 cursor-not-allowed' 
                                : 'bg-gray-50'
                            }`}
                            value={editHostelData.name} 
                            disabled={user?.role === 'Owner'} 
                            onChange={(e) => setEditHostelData({ ...editHostelData, name: e.target.value })} 
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Base Rent (PKR)</label>
                          <input 
                            type="number" 
                            className={`w-full p-4 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none ${
                              user?.role === 'Owner' 
                                ? 'bg-gray-100 opacity-70 cursor-not-allowed' 
                                : 'bg-gray-50'
                            }`}
                            value={editHostelData.minRent} 
                            disabled={user?.role === 'Owner'} 
                            onChange={(e) => setEditHostelData({ ...editHostelData, minRent: Number(e.target.value) })} 
                          />
                       </div>
                    </div>

                    <div className="space-y-8 pt-8 border-t border-gray-100">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <h3 className="text-xl font-black text-gray-900">Inventory & Room Photos</h3>
                          {user?.role === 'Admin' && (
                            <div className="flex gap-2">
                               <input type="text" id="new-room-num" placeholder="Room #" className="p-3 bg-gray-50 border-none rounded-xl text-xs font-bold w-28 focus:ring-2 focus:ring-blue-500" />
                               <Button size="sm" type="button" className="rounded-xl px-5" onClick={() => { const i = document.getElementById('new-room-num') as HTMLInputElement; addRoom(i.value); i.value = ''; }}>Add Room</Button>
                            </div>
                          )}
                       </div>
                       
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {editHostelData.rooms.map(room => (
                             <div key={room.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col gap-6 relative group/room">
                                <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-blue-600 shadow-sm border border-gray-50">#{room.number}</div>
                                      <p className="font-black text-gray-900 uppercase text-xs tracking-widest">Room</p>
                                   </div>
                                   <div className="flex gap-2">
                                      <button type="button" onClick={() => toggleRoomAvailability(room.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        room.isAvailable ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-gray-200 text-gray-400'
                                      }`}>
                                         {room.isAvailable ? 'Available' : 'Booked'}
                                      </button>
                                      {user?.role === 'Admin' && (
                                        <button type="button" onClick={() => removeRoom(room.id)} className="text-red-400 hover:text-red-600 p-2 transition-colors"><Trash2 className="w-5 h-5" /></button>
                                      )}
                                   </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                   <div className="space-y-1">
                                      <label className="text-[8px] font-black uppercase text-gray-400">Capacity</label>
                                      <input 
                                        type="number" 
                                        className={`w-full p-3 bg-white border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 ${
                                          user?.role === 'Owner' ? 'opacity-50 cursor-not-allowed' : ''
                                        }`} 
                                        value={room.capacity} 
                                        disabled={user?.role === 'Owner'}
                                        onChange={(e) => {
                                         const rooms = editHostelData.rooms.map(r => r.id === room.id ? { ...r, capacity: Number(e.target.value) } : r);
                                         setEditHostelData({ ...editHostelData, rooms });
                                      }} />
                                   </div>
                                   <div className="space-y-1">
                                      <label className="text-[8px] font-black uppercase text-gray-400">Residents</label>
                                      <input 
                                        type="number" 
                                        className={`w-full p-3 bg-white border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 ${
                                          user?.role === 'Owner' ? 'opacity-50 cursor-not-allowed' : ''
                                        }`} 
                                        value={room.occupants} 
                                        disabled={user?.role === 'Owner'}
                                        onChange={(e) => {
                                         const rooms = editHostelData.rooms.map(r => r.id === room.id ? { ...r, occupants: Number(e.target.value) } : r);
                                         setEditHostelData({ ...editHostelData, rooms });
                                      }} />
                                   </div>
                                </div>
                                
                                {/* Room Photos Management */}
                                <div className="space-y-2">
                                  <label className="text-[8px] font-black uppercase text-gray-400">Room Photos</label>
                                  <div className="flex gap-2 overflow-x-auto pb-2">
                                     {room.photos.map((p, idx) => (
                                       <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-white flex-shrink-0 shadow-sm group/img">
                                         <img src={p} className="w-full h-full object-cover" alt="" />
                                         <button 
                                            type="button"
                                            className="absolute top-0 right-0 p-1 bg-red-600 text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                                            onClick={() => {
                                              const newPhotos = room.photos.filter((_, i) => i !== idx);
                                              setEditHostelData({
                                                ...editHostelData,
                                                rooms: editHostelData.rooms.map(r => r.id === room.id ? { ...r, photos: newPhotos } : r)
                                              });
                                            }}
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                       </div>
                                     ))}
                                     <label className="w-16 h-16 rounded-lg bg-white border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors cursor-pointer">
                                       <Camera className="w-5 h-5" />
                                       <span className="text-[8px] font-black uppercase mt-1">Add</span>
                                       <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleRoomImageSelect(room.id, e)} />
                                     </label>
                                  </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <Button fullWidth size="lg" className="rounded-2xl py-6 shadow-2xl shadow-blue-100 text-lg">Save Listing Changes</Button>
                    </div>
                 </form>
              </div>
           </div>
        )}

        {view === 'add-hostel' && (
           <div className="max-w-3xl mx-auto py-12 px-4 animate-in zoom-in-95 duration-500">
              <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-2xl space-y-10">
                 <div className="text-center space-y-2">
                    <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto">
                       <Plus className="w-10 h-10 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900">List New Property</h2>
                    <p className="text-gray-500 font-medium">Follow Hostela's standards to get verified quickly.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2">
  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Hostel Name</label>
  <input 
    type="text" 
    placeholder="e.g. Blue Sky Residence" 
    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
    value={newName}
    onChange={(e) => setNewName(e.target.value)} 
  />
</div>
                   <div className="space-y-2">
  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Location / City</label>
  <input 
    type="text" 
    placeholder="e.g. Islamabad" 
    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
    value={newCity}
    onChange={(e) => setNewCity(e.target.value)} 
  />
</div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Upload Facility Photos</label>
                       <span className="text-[10px] font-bold text-blue-600">Integrates with Firebase Storage</span>
                    </div>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                       {tempUploadedImages.map((img, idx) => (
                         <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                            <img src={img} className="w-full h-full object-cover" alt="" />
                            <button className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full" onClick={() => setTempUploadedImages(prev => prev.filter((_, i) => i !== idx))}>
                               <X className="w-3 h-3" />
                            </button>
                         </div>
                       ))}
                       <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="aspect-square rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-all"
                       >
                          <Upload className="w-6 h-6 mb-2" />
                          <span className="text-[10px] font-black uppercase">Browse</span>
                       </button>
                    </div>
                    <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                    <p className="text-[10px] text-gray-400 italic text-center">Add high-quality photos of common areas, kitchens, and exteriors.</p>
                 </div>

                 <div className="space-y-4">
                    <Button fullWidth size="lg" className="rounded-2xl py-6 shadow-xl shadow-blue-100 text-lg" onClick={() => {
                       if (user) {
                         alert("Listing submitted for admin moderation. We'll verify your photos soon.");
                         setView(user.role === 'Admin' ? 'admin-dashboard' : 'owner-dashboard');
                       } else {
                          handleOwnerRegister();
                       }
                    }}>Submit for Verification</Button>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] text-center">Registration requires Gmail ID verification</p>
                 </div>
              </div>
           </div>
        )}

        {view === 'admin-login' && (
           <div className="max-w-md mx-auto py-24 px-4 animate-in zoom-in-95 duration-300">
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl space-y-8 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                 
                 <div className="text-center space-y-2">
                   <div className="w-16 h-16 bg-gray-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gray-200">
                     <ShieldCheck className="w-8 h-8" />
                   </div>
                   <h2 className="text-2xl font-black">Admin HQ</h2>
                   <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">Secure Multi-Factor Access</p>
                 </div>

                 {adminLoginStep === 'email' ? (
                   <form onSubmit={handleAdminEmailSubmit} className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Admin Email Address</label>
                         <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                               type="email" 
                               required 
                               className="w-full pl-11 pr-4 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                               value={adminEmailInput} 
                               onChange={(e) => setAdminEmailInput(e.target.value)} 
                               placeholder="admin@hostela.com"
                            />
                         </div>
                      </div>
                      {adminLoginError && (
                        <div className="p-3 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 border border-red-100 animate-pulse">
                          <AlertCircle className="w-4 h-4" /> {adminLoginError}
                        </div>
                      )}
                      <Button fullWidth className="rounded-2xl py-5 shadow-xl shadow-gray-200" size="lg">Verify Admin Email</Button>
                   </form>
                 ) : (
                   <form onSubmit={handleAdminMFASubmit} className="space-y-6 animate-in slide-in-from-right duration-300">
                      <div className="text-center p-4 bg-blue-50 rounded-2xl mb-4">
                         <p className="text-xs font-bold text-blue-700">Verification required for {activeAdminProfile?.name}</p>
                         <p className="text-[10px] text-blue-500 mt-1 uppercase">Step 2: Enter Secure Security PIN</p>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Security PIN</label>
                         <div className="relative">
                            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                               type="password" 
                               required 
                               maxLength={6}
                               className="w-full pl-11 pr-4 py-4 bg-gray-50 border-none rounded-2xl font-black text-2xl tracking-[1em] text-center focus:ring-2 focus:ring-blue-500 outline-none" 
                               value={adminPinInput} 
                               onChange={(e) => setAdminPinInput(e.target.value)} 
                               placeholder="••••••"
                               autoFocus
                            />
                         </div>
                      </div>
                      {adminLoginError && (
                        <div className="p-3 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 border border-red-100">
                          <AlertCircle className="w-4 h-4" /> {adminLoginError}
                        </div>
                      )}
                      <div className="flex gap-3">
                         <Button type="button" variant="outline" className="flex-1 rounded-2xl" onClick={() => { setAdminLoginStep('email'); setAdminLoginError(''); }}>Back</Button>
                         <Button className="flex-[2] rounded-2xl py-5 shadow-xl shadow-blue-200" size="lg">Authorize Entry</Button>
                      </div>
                   </form>
                 )}
              </div>
           </div>
        )}
      </main>

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
               <a href={`https://wa.me/${ADMIN_WHATSAPP}`} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-green-500 transition-colors shadow-sm"><MessageCircle className="w-5 h-5" /></a>
            </div>
          </div>

          <div className="space-y-4 md:text-right">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">© 2024 Verified Student Marketplace</p>
            <div className="flex justify-center md:justify-end gap-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <button type="button" className="hover:text-blue-600 transition-colors">Privacy</button>
              <button type="button" className="hover:text-blue-600 transition-colors">Terms</button>
              <button 
                type="button" 
                className="hover:text-blue-600 transition-colors font-bold text-gray-600" 
                onClick={(e) => { e.preventDefault(); setView('admin-login'); }}
              >
                Admin Login
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
