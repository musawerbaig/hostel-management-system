import { db } from './firebase'; 
import { collection, addDoc, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { translations } from './translations';
import { Language, User, Hostel, Review, Gender, Room, Inquiry, InquiryStatus, View } from './types';

import { signUpWithEmail, signInWithEmail, signOutUser, watchAuth } from './auth';
import { submitInquiry, fetchInquiriesForStudent, fetchInquiriesForOwner, fetchAllInquiries, updateInquiryStatus, fetchAllReviews, submitReview, seedIslamabadListings } from './services';
import { uploadHostelPhotos } from './uploads';
import { Button } from './components/Button';
import { Navbar } from './components/Navbar';
import { HostelCard } from './components/HostelCard';
import { Footer } from './components/Footer';
import { ReviewsSection } from './components/ReviewsSection';
import { InquiryPanel } from './components/InquiryPanel';
import { MyInquiriesView } from './components/MyInquiriesView';
import { InquiriesInbox } from './components/InquiriesInbox';
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
  const [hostels, setHostels] = useState<Hostel[]>([]);
  // This pulls live data from your Firebase
  // R1 (audit B-1): Firestore list queries must be shaped to the security
  // rules or they are denied outright. Public query = approved only (the
  // only read the rules grant signed-out). Signed-in extras are merged in
  // by the effect below. There is NO mock fallback: empty means empty.
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "hostels"), where("status", "==", "approved")));
        setHostels(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Hostel, 'id'>) })));
      } catch (error) {
        console.error("Error fetching listings:", error);
      }
    })();
  }, []);

  // Owners additionally see their own listings at any status; admins see all.
  useEffect(() => {
    if (!user || user.role === 'Student') return;
    (async () => {
      try {
        const q = user.role === 'Admin'
          ? collection(db, "hostels")
          : query(collection(db, "hostels"), where("ownerId", "==", user.id));
        const snap = await getDocs(q);
        const extra = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Hostel, 'id'>) }));
        setHostels(prev => {
          const byId = new Map(prev.map(h => [h.id, h]));
          extra.forEach(h => byId.set(h.id, h));
          return [...byId.values()];
        });
      } catch (error) {
        console.error("Error fetching dashboard listings:", error);
      }
    })();
  }, [user]);
  const [reviews, setReviews] = useState<Review[]>([]);
  // Phase 2: reviews are persisted in Firestore (gated — see services.ts).
  useEffect(() => {
    (async () => {
      try {
        const live = await fetchAllReviews();
        setReviews(live);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    })();
  }, []);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  useEffect(() => {
    if (!user) { setInquiries([]); return; }
    (async () => {
      try {
        const data = user.role === 'Admin' ? await fetchAllInquiries()
          : user.role === 'Owner' ? await fetchInquiriesForOwner(user.id)
          : await fetchInquiriesForStudent(user.id);
        setInquiries(data);
      } catch (error) {
        console.error("Error fetching inquiries:", error);
      }
    })();
  }, [user]);
  const [view, setView] = useState<View>('home');
  const [seedMsg, setSeedMsg] = useState('');
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  
  // Hostel Edit State
  const [editHostelData, setEditHostelData] = useState<Hostel | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<Gender | 'All'>('All');
  const [maxRentFilter, setMaxRentFilter] = useState<number>(100000);
  const [sortBy, setSortBy] = useState<'recommended' | 'rent-asc' | 'rent-desc' | 'rating' | 'distance'>('recommended');

  // Auth form state (Phase 1: real Firebase Auth — see auth.ts)
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState<'Student' | 'Owner'>('Student');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Keep the signed-in user in sync with the real Firebase session.
  useEffect(() => watchAuth(setUser), []);
  
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Phase 2: inquiry form state
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryMoveIn, setInquiryMoveIn] = useState('');
  const [inquiryBusy, setInquiryBusy] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  useEffect(() => { setInquirySent(false); setInquiryMessage(''); }, [selectedHostel]);

  // Image Upload State — previews for the UI plus the real File objects
  // that Phase 2 uploads to Firebase Storage on submit.
  const [tempUploadedImages, setTempUploadedImages] = useState<string[]>([]);
  const [tempImageFiles, setTempImageFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  const getAvgRating = (hostelId: string) => {
    const hostelReviews = reviews.filter(r => r.hostelId === hostelId);
    if (hostelReviews.length === 0) return 'New';
    const sum = hostelReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / hostelReviews.length).toFixed(1);
  };

  const friendlyAuthError = (err: unknown) => {
    const code = (err as { code?: string })?.code ?? '';
    if (code.includes('email-already-in-use')) return 'An account with this email already exists. Sign in instead.';
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Email or password is incorrect.';
    if (code.includes('weak-password')) return 'Password is too weak — use at least 6 characters.';
    if (code.includes('invalid-email')) return 'That email address does not look valid.';
    return 'Something went wrong. Check your connection and try again.';
  };

  const goAfterLogin = (profile: User) => {
    if (profile.role === 'Admin') setView('admin-dashboard');
    else if (profile.role === 'Owner') setView('owner-dashboard');
    else if (selectedHostel) setView('details');
    else setView('home');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    try {
      const profile = await signInWithEmail(authEmail.trim(), authPassword);
      setUser(profile);
      setAuthPassword('');
      goAfterLogin(profile);
    } catch (err) {
      setAuthError(friendlyAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    try {
      const profile = await signUpWithEmail(authName.trim(), authEmail.trim(), authPassword, authRole);
      setUser(profile);
      setAuthPassword('');
      if (profile.role === 'Owner') {
        alert('Owner account created. An admin will approve your account before your listings can go live.');
        setView('owner-dashboard');
      } else {
        setView('home');
      }
    } catch (err) {
      setAuthError(friendlyAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setUser(null);
    setView('home');
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

  const sortedHostels = useMemo(() => {
    const ratingOf = (id: string) => {
      const r = getAvgRating(id);
      return r === 'New' ? 0 : parseFloat(r);
    };
    const list = [...filteredHostels];
    switch (sortBy) {
      case 'rent-asc': return list.sort((a, b) => a.minRent - b.minRent);
      case 'rent-desc': return list.sort((a, b) => b.minRent - a.minRent);
      case 'rating': return list.sort((a, b) => ratingOf(b.id) - ratingOf(a.id));
      case 'distance': return list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
      default: return list;
    }
  }, [filteredHostels, sortBy, reviews]);

  const displayedHostels = user?.role === 'Admin' ? hostels : hostels.filter(h => h.ownerId === user?.id);

  const handleSeedListings = async () => {
    if (!user || user.role !== 'Admin') return;
    setSeedMsg('Adding demo listings…');
    try {
      const added = await seedIslamabadListings(user.id, hostels.map(h => h.name));
      const snap = await getDocs(collection(db, "hostels"));
      setHostels(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Hostel, 'id'>) })));
      setSeedMsg(added > 0 ? `${added} demo listings added and approved.` : 'All demo listings are already loaded.');
    } catch (error) {
      console.error("Seed error:", error);
      setSeedMsg('Seeding failed — please try again.');
    }
  };

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
      const fileArr = Array.from(files);
      setTempImageFiles(prev => [...prev, ...fileArr]);
      const newImages = fileArr.map((file: File) => URL.createObjectURL(file));
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

  // Phase 2: the inquiry behind the review form. A review is only possible
  // for an inquiry the owner has marked 'stayed' (also enforced in rules).
  const stayedInquiry = (user && selectedHostel)
    ? inquiries.find(i => i.hostelId === selectedHostel.id && i.studentId === user.id && i.status === 'stayed')
    : undefined;
  const myReviewForSelected = stayedInquiry
    ? reviews.find(r => r.inquiryId === stayedInquiry.id)
    : undefined;

  const handleStudentAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHostel || !user || !stayedInquiry || !reviewComment.trim()) return;
    try {
      const saved = await submitReview(stayedInquiry, user.name, reviewRating, reviewComment.trim());
      setReviews(prev => [saved, ...prev.filter(r => r.id !== saved.id)]);
      setReviewComment('');
      alert("Thank you! Your verified review is now live.");
    } catch (error) {
      console.error("Review error:", error);
      alert("Could not save your review — reviews open once the owner confirms your stay.");
    }
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHostel || !user || !inquiryMessage.trim()) return;
    setInquiryBusy(true);
    try {
      const saved = await submitInquiry({
        hostelId: selectedHostel.id,
        hostelName: selectedHostel.name,
        ownerId: selectedHostel.ownerId,
        studentId: user.id,
        studentName: user.name,
        studentPhone: inquiryPhone.trim() || undefined,
        message: inquiryMessage.trim(),
        moveIn: inquiryMoveIn.trim() || undefined,
      });
      setInquiries(prev => [saved, ...prev]);
      setInquirySent(true);
    } catch (error) {
      console.error("Inquiry error:", error);
      alert("Could not send your inquiry. Check your connection and try again.");
    } finally {
      setInquiryBusy(false);
    }
  };

  const handleInquiryStatus = async (id: string, status: InquiryStatus) => {
    try {
      await updateInquiryStatus(id, status);
      setInquiries(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    } catch (error) {
      console.error("Inquiry status error:", error);
      alert("Failed to update the inquiry status.");
    }
  };

  // Phase 2: the Add Hostel form really saves now — photos upload to
  // Firebase Storage first (graceful fallback until Storage is activated).
  const handleSubmitListing = async () => {
    if (!user) {
      alert('Create an owner account first — your listing will be saved under your own account.');
      setView('signup');
      return;
    }
    if (!newName.trim() || !newCity.trim()) {
      alert("Please enter the hostel name and city first!");
      return;
    }
    setIsSubmitting(true);
    try {
      let photoUrls: string[] = [];
      if (tempImageFiles.length > 0) {
        try {
          photoUrls = await uploadHostelPhotos(user.id, tempImageFiles);
        } catch (err) {
          console.error("Storage upload failed:", err);
          const proceed = window.confirm("Photo storage isn't activated for this project yet, so photos can't be uploaded right now. Submit the listing without photos?");
          if (!proceed) { setIsSubmitting(false); return; }
        }
      }
      await addDoc(collection(db, "hostels"), {
        name: newName.trim(),
        city: newCity.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        ownerId: user.id,
        photos: photoUrls.length > 0 ? photoUrls : ['https://picsum.photos/seed/hostel/800/600'],
        gender: 'Boys',
        minRent: 10000,
        maxRent: 10000,
        admissionCharges: 0,
        securityFee: 0,
        address: '',
        description: '',
        rooms: [],
        whatsappNumber: '',
        isVerified: false
      });
      alert("Listing submitted for admin moderation. We'll verify it soon.");
      setNewName('');
      setNewCity('');
      setTempUploadedImages([]);
      setTempImageFiles([]);
      setView(user.role === 'Admin' ? 'admin-dashboard' : 'owner-dashboard');
    } catch (error) {
      console.error("Firebase Error:", error);
      alert("Error saving! Check your internet or Firebase Rules.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] text-gray-900 selection:bg-blue-100" dir={lang === 'ur' || lang === 'ar' ? 'rtl' : 'ltr'}>
      
      <Navbar lang={lang} onLangChange={setLang} user={user} t={t} onNavigate={setView} onLogout={handleLogout} />

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
                  Verified student hostels near COMSATS Islamabad. Every listing is checked by our team before it goes live — send an inquiry and the owner replies to you directly.
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
                    <select
                      className="flex-grow md:min-w-[180px] p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    >
                      <option value="recommended">Sort: Recommended</option>
                      <option value="rent-asc">Rent: Low to High</option>
                      <option value="rent-desc">Rent: High to Low</option>
                      <option value="rating">Top Rated</option>
                      <option value="distance">Nearest to COMSATS</option>
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
              {sortedHostels.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sortedHostels.map(h => (
<HostelCard hostel={h} avgRating={getAvgRating(h.id)} onOpen={(hostel) => { setSelectedHostel(hostel); setView('details'); window.scrollTo(0,0); }} />
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
                        <h4 className="text-lg font-bold">Direct Owner Contact</h4>
                        <p className="text-gray-400 text-sm">No middlemen and no booking fees. Your inquiry goes straight to the hostel owner, who confirms availability with you directly.</p>
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
                        <p className="font-bold">How Hostela verifies</p>
                        <p className="text-xs text-blue-400">The checks behind the badge</p>
                      </div>
                    </div>
                    <p className="text-gray-300 italic mb-6">"Every listing passes our verification checklist: the owner's identity and right to list the property, a phone number we have reached them on, and photos checked for consistency. Verification is a document and consistency check done remotely — we never claim a physical visit that did not happen."</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-green-500 w-5 h-5" />
                      <span className="text-sm font-bold">Verified Listing Checklist</span>
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
                          {selectedHostel.distanceKm !== undefined && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-full">{selectedHostel.distanceKm} km from COMSATS</span>
                          )}
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

                     <ReviewsSection hostel={selectedHostel} reviews={reviews} t={t} user={user} stayedInquiry={stayedInquiry} myReview={myReviewForSelected} reviewRating={reviewRating} onRatingChange={setReviewRating} reviewComment={reviewComment} onCommentChange={setReviewComment} onSubmitReview={handleStudentAddReview} onSignIn={() => setView('login')} />
                  </div>

<InquiryPanel hostel={selectedHostel} user={user} sent={inquirySent} busy={inquiryBusy} message={inquiryMessage} onMessageChange={setInquiryMessage} phone={inquiryPhone} onPhoneChange={setInquiryPhone} moveIn={inquiryMoveIn} onMoveInChange={setInquiryMoveIn} onSubmitInquiry={handleSubmitInquiry} onSignIn={() => setView('login')} />
               </div>
            </div>
          </div>
        )}

        {view === 'my-inquiries' && user && (
          <MyInquiriesView inquiries={inquiries} onBrowse={() => setView('home')} />
        )}
        {(view === 'owner-dashboard' || view === 'admin-dashboard') && (
           <div className="max-w-6xl mx-auto py-12 px-4 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                 <div>
                    <h2 className="text-4xl font-black text-gray-900">{user?.role === 'Admin' ? t.adminPortal : t.ownerPortal}</h2>
                    <p className="text-gray-500 mt-2 font-medium">Manage properties and room availability.</p>
                 </div>
                 <div className="flex flex-wrap gap-3">
                   {user?.role === 'Admin' && (
                     <Button variant="outline" onClick={handleSeedListings} size="lg" className="rounded-2xl gap-2">Load Islamabad Demo Listings</Button>
                   )}
                   {seedMsg && <p className="w-full text-xs font-semibold text-gray-500">{seedMsg}</p>}
                   <Button onClick={() => setView('add-hostel')} size="lg" className="rounded-2xl gap-2 shadow-xl shadow-blue-100"><Plus className="w-5 h-5" /> {t.addHostel}</Button>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {user?.role === 'Owner' && !user?.isApproved && (
                  <div className="p-5 bg-yellow-50 border-2 border-yellow-100 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                    <p className="text-sm font-bold text-yellow-800">Your owner account is waiting for admin approval. You can prepare listings, but they cannot go live until an admin approves your account.</p>
                  </div>
                )}
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
                <InquiriesInbox inquiries={inquiries} onStatus={handleInquiryStatus} />
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
                            <button className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full" onClick={() => { setTempUploadedImages(prev => prev.filter((_, i) => i !== idx)); setTempImageFiles(prev => prev.filter((_, i) => i !== idx)); }}>
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
                    <Button fullWidth size="lg" disabled={isSubmitting} className="rounded-2xl py-6 shadow-xl shadow-blue-100 text-lg" onClick={handleSubmitListing}>{isSubmitting ? 'Submitting…' : 'Submit for Verification'}</Button>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] text-center">Registration requires Gmail ID verification</p>
                 </div>
              </div>
           </div>
        )}

        {(view === 'login' || view === 'signup') && (
           <div className="max-w-md mx-auto py-24 px-4 animate-in zoom-in-95 duration-300">
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl space-y-8 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

                 <div className="text-center space-y-2">
                   <div className="w-16 h-16 bg-gray-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gray-200">
                     <ShieldCheck className="w-8 h-8" />
                   </div>
                   <h2 className="text-2xl font-black">{view === 'login' ? 'Welcome back' : 'Create your account'}</h2>
                   <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">{view === 'login' ? 'Sign in to Hostela' : 'Students & hostel owners'}</p>
                 </div>

                 <form onSubmit={view === 'login' ? handleSignIn : handleSignUp} className="space-y-5">
                    {view === 'signup' && (
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Full Name</label>
                         <input
                            type="text"
                            required
                            className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={authName}
                            onChange={(e) => setAuthName(e.target.value)}
                            placeholder="e.g. Ali Raza"
                         />
                      </div>
                    )}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Email Address</label>
                       <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                             type="email"
                             required
                             className="w-full pl-11 pr-4 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                             value={authEmail}
                             onChange={(e) => setAuthEmail(e.target.value)}
                             placeholder="you@example.com"
                          />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Password</label>
                       <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                             type="password"
                             required
                             minLength={6}
                             className="w-full pl-11 pr-4 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                             value={authPassword}
                             onChange={(e) => setAuthPassword(e.target.value)}
                             placeholder="••••••••"
                          />
                       </div>
                    </div>
                    {view === 'signup' && (
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">I am a</label>
                         <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => setAuthRole('Student')} className={`py-3 rounded-2xl font-bold border-2 transition-all ${authRole === 'Student' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>Student</button>
                            <button type="button" onClick={() => setAuthRole('Owner')} className={`py-3 rounded-2xl font-bold border-2 transition-all ${authRole === 'Owner' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>Hostel Owner</button>
                         </div>
                         {authRole === 'Owner' && (
                           <p className="text-[10px] text-gray-400 font-bold px-1">Owner accounts need admin approval before listings can go live.</p>
                         )}
                      </div>
                    )}
                    {authError && (
                      <div className="p-3 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 border border-red-100">
                        <AlertCircle className="w-4 h-4" /> {authError}
                      </div>
                    )}
                    <Button fullWidth className="rounded-2xl py-5 shadow-xl shadow-blue-200" size="lg" disabled={authBusy}>
                      {authBusy ? 'Please wait…' : view === 'login' ? 'Sign In' : 'Create Account'}
                    </Button>
                 </form>

                 <p className="text-center text-xs font-bold text-gray-400">
                   {view === 'login' ? (
                     <>New to Hostela? <button type="button" className="text-blue-600" onClick={() => { setView('signup'); setAuthError(''); }}>Create an account</button></>
                   ) : (
                     <>Already have an account? <button type="button" className="text-blue-600" onClick={() => { setView('login'); setAuthError(''); }}>Sign in</button></>
                   )}
                 </p>
              </div>
           </div>
        )}
      </main>

      <Footer onSignIn={() => setView('login')} />
    </div>
  );
}
