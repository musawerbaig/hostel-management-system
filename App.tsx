import { db } from './firebase'; 
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import React, { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { translations } from './translations';
import { Language, User, Hostel, Review, Gender, RoomType, Amenity, Inquiry, InquiryStatus, View, COMSATS, distanceKm } from './types';

import { signUpWithEmail, signInWithEmail, signOutUser, sendPasswordReset, watchAuth, fetchProfile } from './auth';
import { submitInquiry, fetchInquiriesForStudent, fetchInquiriesForOwner, fetchAllInquiries, updateInquiryStatus, fetchAllReviews, submitReview, seedIslamabadListings, saveVerificationDocs, fetchVerificationDocs, createListingContact, fetchFavourites, toggleFavourite, docToModel } from './services';
import { uploadHostelPhotos, uploadVerificationDocs } from './uploads';
import { notifyOwnerOfInquiry } from './notifications';
import { evaluateChecklist } from './verification';
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
  LayoutDashboard,
  Heart,
  Map as MapIcon
} from 'lucide-react';

// R6: the Leaflet map is lazy-loaded so its bundle only downloads on demand.
const HostelMap = lazy(() => import('./HostelMap').then(m => ({ default: m.HostelMap })));

export default function App() {
  // R3a: one draft object for the full listing form (PRD §8 fields).
  const DEFAULT_DRAFT = {
    name: '', area: '', description: '', address: '',
    latitude: COMSATS.latitude, longitude: COMSATS.longitude,
    gender: 'boys' as Gender, roomTypes: [] as RoomType[],
    pricePerBedMonthly: 0, messAvailable: false, messPriceMonthly: 0,
    securityDeposit: 0, otherChargesNote: '', totalBeds: 1, bedsAvailable: 1,
    availableFrom: new Date().toISOString().split('T')[0],
    amenities: [] as Amenity[], rules: '', nearbyExtra: '',
  };
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const setDraftField = <K extends keyof typeof DEFAULT_DRAFT>(key: K, value: (typeof DEFAULT_DRAFT)[K]) =>
    setDraft(d => ({ ...d, [key]: value }));
  const toggleDraftList = (key: 'roomTypes' | 'amenities', value: string) =>
    setDraft(d => {
      const list = d[key] as string[];
      return { ...d, [key]: list.includes(value) ? list.filter(x => x !== value) : [...list, value] };
    });
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
        const snap = await getDocs(query(collection(db, "hostels"), where("status", "==", "live")));
        setHostels(snap.docs.map(d => docToModel(d.id, d.data()) as Hostel));
      } catch (error) {
        console.error("Error fetching listings:", error);
      }
    })();
  }, []);

  // Owners additionally see their own listings at any status; admins see all.
  useEffect(() => {
    if (!user || user.role === 'student') return;
    (async () => {
      try {
        const q = user.role === 'admin'
          ? collection(db, "hostels")
          : query(collection(db, "hostels"), where("ownerId", "==", user.id));
        const snap = await getDocs(q);
        const extra = snap.docs.map(d => docToModel(d.id, d.data()) as Hostel);
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
        const data = user.role === 'admin' ? await fetchAllInquiries()
          : user.role === 'owner' ? await fetchInquiriesForOwner(user.id)
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
  const [sortBy, setSortBy] = useState<'recommended' | 'rent-asc' | 'rent-desc' | 'distance' | 'beds'>('recommended');
  // R6 filters
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomType | 'All'>('All');
  const [amenityFilters, setAmenityFilters] = useState<Amenity[]>([]);
  const [bedsOnlyFilter, setBedsOnlyFilter] = useState(false);
  const [nearComsatsFilter, setNearComsatsFilter] = useState(false);
  const [favOnlyFilter, setFavOnlyFilter] = useState(false);
  const [showMap, setShowMap] = useState(false);
  // R6 favourites (listing ids saved by the signed-in user)
  const [favourites, setFavourites] = useState<Set<string>>(new Set());

  // Auth form state (Phase 1: real Firebase Auth — see auth.ts)
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState<'student' | 'owner'>('student');
  const [authPhone, setAuthPhone] = useState('');
  const [authUniversity, setAuthUniversity] = useState('');
  const [authResetMsg, setAuthResetMsg] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Keep the signed-in user in sync with the real Firebase session.
  useEffect(() => watchAuth(setUser), []);

  // R6: load the signed-in user's favourites; signed-out users have none.
  useEffect(() => {
    if (!user) { setFavourites(new Set()); return; }
    fetchFavourites(user.id).then(ids => setFavourites(new Set(ids))).catch(() => {});
  }, [user]);

  // R6: per-listing URLs (hash routing). The detail view mirrors
  // #/hostel/{id} so a listing can be shared and linked to directly.
  const openHostel = (hostel: Hostel) => {
    setSelectedHostel(hostel);
    setView('details');
    window.location.hash = `#/hostel/${hostel.id}`;
    window.scrollTo(0, 0);
  };
  const navigateHome = () => {
    setSelectedHostel(null);
    setView('home');
    window.location.hash = '';
  };
  // Deep link on first load + back/forward buttons.
  useEffect(() => {
    const fromHash = () => {
      const m = window.location.hash.match(/^#\/hostel\/([^/]+)$/);
      if (!m) return;
      const found = hostels.find(h => h.id === m[1]);
      if (found) { setSelectedHostel(found); setView('details'); }
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [hostels]);

  const handleToggleFavourite = async (hostel: Hostel) => {
    if (!user) { setView('login'); return; }
    const saving = !favourites.has(hostel.id);
    setFavourites(prev => {
      const next = new Set(prev);
      if (saving) next.add(hostel.id); else next.delete(hostel.id);
      return next;
    });
    try {
      await toggleFavourite(user.id, hostel.id, saving);
    } catch (err) {
      console.error('Favourite error:', err);
      setFavourites(prev => {
        const next = new Set(prev);
        if (saving) next.delete(hostel.id); else next.add(hostel.id);
        return next;
      });
    }
  };
  
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Phase 2: inquiry form state
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryMoveIn, setInquiryMoveIn] = useState('');
  const [inquiryBeds, setInquiryBeds] = useState(1);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [inquiryBusy, setInquiryBusy] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  useEffect(() => { setInquirySent(false); setInquiryMessage(''); setOwnerPhone(''); }, [selectedHostel]);

  // Image Upload State — previews for the UI plus the real File objects
  // that Phase 2 uploads to Firebase Storage on submit.
  const [tempUploadedImages, setTempUploadedImages] = useState<string[]>([]);
  const [tempDocFiles, setTempDocFiles] = useState<File[]>([]);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [editMediaBusy, setEditMediaBusy] = useState(false);
  const [tempImageFiles, setTempImageFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  const getAvgRating = (hostelId: string) => {
    const hostelReviews = reviews.filter(r => r.hostelId === hostelId && r.status === 'visible');
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
    if (profile.role === 'admin') setView('admin-dashboard');
    else if (profile.role === 'owner') setView('owner-dashboard');
    else if (selectedHostel) { setView('details'); window.location.hash = `#/hostel/${selectedHostel.id}`; }
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
      const profile = await signUpWithEmail(authName.trim(), authEmail.trim(), authPassword, authRole, authPhone.trim(), authUniversity.trim() || undefined);
      setUser(profile);
      setAuthPassword('');
      if (profile.role === 'owner') {
        alert('Owner account created. Submit a listing and an admin will verify it before it goes live.');
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

  const handlePasswordReset = async () => {
    if (!authEmail.trim()) { setAuthError('Enter your email address first.'); return; }
    setAuthError('');
    try {
      await sendPasswordReset(authEmail.trim());
      setAuthResetMsg('Password reset email sent — check your inbox.');
    } catch {
      setAuthError('Could not send the reset email. Check the address and try again.');
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setUser(null);
    setView('home');
    window.location.hash = '';
  };

  const filteredHostels = useMemo(() => {
    return hostels.filter(h => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = h.name.toLowerCase().includes(q) ||
                           h.area.toLowerCase().includes(q);
      const matchesGender = genderFilter === 'All' || h.gender === genderFilter;
      const matchesRent = h.pricePerBedMonthly <= maxRentFilter;
      const matchesRoom = roomTypeFilter === 'All' || h.roomTypes.includes(roomTypeFilter);
      const matchesAmenities = amenityFilters.every(a => h.amenities.includes(a));
      const matchesBeds = !bedsOnlyFilter || h.bedsAvailable > 0;
      const matchesNear = !nearComsatsFilter || distanceKm(COMSATS.latitude, COMSATS.longitude, h.latitude, h.longitude) <= 2;
      const matchesFav = !favOnlyFilter || favourites.has(h.id);
      return matchesSearch && matchesGender && matchesRent && matchesRoom && matchesAmenities && matchesBeds && matchesNear && matchesFav && h.status === 'live';
    });
  }, [hostels, searchQuery, genderFilter, maxRentFilter, roomTypeFilter, amenityFilters, bedsOnlyFilter, nearComsatsFilter, favOnlyFilter, favourites]);

  const sortedHostels = useMemo(() => {
    const list = [...filteredHostels];
    const dist = (h: Hostel) => distanceKm(COMSATS.latitude, COMSATS.longitude, h.latitude, h.longitude);
    switch (sortBy) {
      case 'rent-asc': return list.sort((a, b) => a.pricePerBedMonthly - b.pricePerBedMonthly);
      case 'rent-desc': return list.sort((a, b) => b.pricePerBedMonthly - a.pricePerBedMonthly);
      case 'distance': return list.sort((a, b) => dist(a) - dist(b));
      case 'beds': return list.sort((a, b) => b.bedsAvailable - a.bedsAvailable);
      default: return list.sort((a, b) => String(b.verifiedAt || b.createdAt).localeCompare(String(a.verifiedAt || a.createdAt)));
    }
  }, [filteredHostels, sortBy]);

  const displayedHostels = user?.role === 'admin' ? hostels : hostels.filter(h => h.ownerId === user?.id);

  const handleSeedListings = async () => {
    if (!user || user.role !== 'admin') return;
    setSeedMsg('Adding demo listings…');
    try {
      const added = await seedIslamabadListings(user.id, hostels.map(h => h.name), user.email);
      const snap = await getDocs(collection(db, "hostels"));
      setHostels(snap.docs.map(d => docToModel(d.id, d.data()) as Hostel));
      setSeedMsg(added > 0 ? `${added} demo listings added and verified.` : 'All demo listings are already loaded.');
    } catch (error) {
      console.error("Seed error:", error);
      setSeedMsg('Seeding failed — please try again.');
    }
  };

  const handleEditHostel = (hostel: Hostel) => {
    setEditHostelData({ ...hostel });
    setView('edit-hostel');
  };

  const saveHostelChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHostelData || !user) return;
    // PRD re-verification trigger: an owner changing the name, area or
    // address sends the listing back to 'pending' for admin review.
    const orig = hostels.find(h => h.id === editHostelData.id);
    const identityChanged = !!orig && (orig.name !== editHostelData.name
      || orig.area !== editHostelData.area || orig.address !== editHostelData.address);
    const needsReview = user.role === 'owner' && (!!identityChanged || orig?.status === 'rejected');
    const payload = {
      name: editHostelData.name,
      area: editHostelData.area,
      address: editHostelData.address,
      description: editHostelData.description,
      pricePerBedMonthly: editHostelData.pricePerBedMonthly,
      messAvailable: editHostelData.messAvailable,
      messPriceMonthly: editHostelData.messPriceMonthly,
      securityDeposit: editHostelData.securityDeposit,
      otherChargesNote: editHostelData.otherChargesNote,
      totalBeds: editHostelData.totalBeds,
      bedsAvailable: editHostelData.bedsAvailable,
      availableFrom: editHostelData.availableFrom,
      rules: editHostelData.rules,
      photos: editHostelData.photos,
      ...(needsReview ? { status: 'pending' as const } : {}),
      updatedAt: serverTimestamp(),
    };
    try {
      await updateDoc(doc(db, "hostels", editHostelData.id), payload);
      setHostels(prev => prev.map(h => h.id === editHostelData.id ? { ...h, ...editHostelData, ...(needsReview ? { status: 'pending' as const } : {}) } : h));
      alert(needsReview
        ? "Saved — the listing is back in the verification queue."
        : "Listing updated successfully!");
      setView(user.role === 'admin' ? 'admin-dashboard' : 'owner-dashboard');
    } catch (error) {
      console.error("Save error:", error);
      alert("Could not save the listing. Check your connection and try again.");
    }
  };




  const handleHostelStatusChange = async (id: string, newStatus: 'live' | 'rejected' | 'suspended') => {
    try {
      const hostelRef = doc(db, "hostels", id);
      const patch = newStatus === 'live'
        ? { status: 'live' as const, verifiedAt: serverTimestamp(), verifiedBy: user?.id ?? '', updatedAt: serverTimestamp() }
        : newStatus === 'suspended'
        ? { status: 'suspended' as const, updatedAt: serverTimestamp() }
        : { status: 'rejected' as const, updatedAt: serverTimestamp() };
      await updateDoc(hostelRef, patch);
      setHostels(prev => prev.map(h => h.id === id ? { ...h, status: newStatus, verifiedAt: new Date().toISOString(), verifiedBy: user?.id ?? h.verifiedBy } : h));
      alert(`Hostel has been ${newStatus === 'live' ? 'approved and published' : newStatus === 'suspended' ? 'suspended' : 'rejected'}!`);
    } catch (error) {
      console.error("Admin Error:", error);
      alert("Failed to update status. Check your Firebase Rules.");
    }
  };
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // R4 verification panel state
  const [verifyHostel, setVerifyHostel] = useState<Hostel | null>(null);
  const [verifyDocs, setVerifyDocs] = useState<string[]>([]);
  const [verifyOwnerPhone, setVerifyOwnerPhone] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [usersCount, setUsersCount] = useState(0);
  // R4: admin account count for the dashboard stats row.
  useEffect(() => {
    if (user?.role !== 'admin') return;
    getDocs(collection(db, "users")).then(s => setUsersCount(s.size)).catch(() => {});
  }, [user]);
  const handleDeleteHostel = async (id: string) => {
    // First click arms the confirmation on the button itself; the second
    // click actually deletes. No native dialog involved.
    if (pendingDeleteId !== id) { setPendingDeleteId(id); return; }
    setPendingDeleteId(null);
    try {
      await deleteDoc(doc(db, "hostels", id));
      try { await deleteDoc(doc(db, "listingContacts", id)); } catch { /* contact doc may not exist */ }
      setHostels(prev => prev.filter(h => h.id !== id));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Could not delete the listing. Check your connection and try again.");
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
      const saved = await submitReview(stayedInquiry, user.fullName, reviewRating, reviewComment.trim());
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
    if (!selectedHostel || !user || !inquiryPhone.trim() || !inquiryMoveIn) return;
    setInquiryBusy(true);
    try {
      const saved = await submitInquiry({
        hostelId: selectedHostel.id,
        hostelName: selectedHostel.name,
        ownerId: selectedHostel.ownerId,
        studentId: user.id,
        studentName: user.fullName,
        studentPhone: inquiryPhone.trim(),
        message: inquiryMessage.trim(),
        moveInDate: inquiryMoveIn,
        bedsNeeded: inquiryBeds,
      });
      setInquiries(prev => [saved, ...prev]);
      setInquirySent(true);
      // R5: email the owner now (fire-and-forget; the inquiry is saved
      // regardless of whether the email goes through).
      void notifyOwnerOfInquiry(saved);
      // Owner phone reveal (PRD §11): the owner's number comes from their
      // profile, shown only in the confirmation after an inquiry is sent.
      try {
        const owner = await fetchProfile(selectedHostel.ownerId);
        if (owner?.phone) setOwnerPhone(owner.phone);
      } catch { /* confirmation still works without the number */ }
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
    const errors: string[] = [];
    if (draft.name.trim().length <= 2) errors.push('Hostel name (at least 3 characters)');
    if (!draft.area.trim()) errors.push('Area');
    if (!draft.address.trim()) errors.push('Full address');
    if (draft.pricePerBedMonthly <= 0) errors.push('Price per bed (must be above 0)');
    if (draft.totalBeds < 1) errors.push('Total beds (at least 1)');
    if (draft.bedsAvailable < 0 || draft.bedsAvailable > draft.totalBeds) errors.push('Beds available (between 0 and total beds)');
    if (!draft.availableFrom) errors.push('Available-from date');
    if (draft.roomTypes.length === 0) errors.push('At least one room type');
    if (errors.length > 0) {
      alert('Please complete: ' + errors.join(', ') + '.');
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
          const proceed = window.confirm("Photo upload failed. Submit the listing without photos? The admin will ask for photos before approval.");
          if (!proceed) { setIsSubmitting(false); return; }
        }
      }
      const nearby = [COMSATS.name, ...draft.nearbyExtra.split(',').map(s => s.trim()).filter(Boolean)];
      const listingRef = await addDoc(collection(db, "hostels"), {
        name: draft.name.trim(),
        area: draft.area.trim(),
        description: draft.description.trim(),
        address: draft.address.trim(),
        latitude: draft.latitude,
        longitude: draft.longitude,
        gender: draft.gender,
        roomTypes: draft.roomTypes,
        pricePerBedMonthly: draft.pricePerBedMonthly,
        messAvailable: draft.messAvailable,
        messPriceMonthly: draft.messAvailable ? draft.messPriceMonthly : 0,
        securityDeposit: draft.securityDeposit,
        otherChargesNote: draft.otherChargesNote.trim(),
        totalBeds: draft.totalBeds,
        bedsAvailable: draft.bedsAvailable,
        availableFrom: draft.availableFrom,
        amenities: draft.amenities,
        rules: draft.rules.trim(),
        photos: photoUrls,
        verificationDocs: [],
        hasVerificationDocs: false,
        nearbyUniversities: nearby,
        status: 'pending',
        rejectionReason: '',
        ownerReachable: false,
        verifiedAt: '',
        verifiedBy: '',
        ownerId: user.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // R5: private contact document so future inquirers can notify the
      // owner by email without the address ever being public.
      try {
        await createListingContact(listingRef.id, user.id, user.email);
      } catch (contactErr) {
        console.warn('Listing contact document failed:', contactErr);
      }
      // Verification documents (best effort — the listing is already saved).
      if (tempDocFiles.length > 0) {
        try {
          const docUrls = await uploadVerificationDocs(user.id, tempDocFiles);
          await saveVerificationDocs(listingRef.id, user.id, docUrls);
          await updateDoc(listingRef, { hasVerificationDocs: true, updatedAt: serverTimestamp() });
        } catch (docErr) {
          console.error("Verification-doc upload failed:", docErr);
          alert("Listing saved, but the verification documents could not be uploaded. You can add them later from Manage Property.");
        }
      }
      alert("Listing submitted for admin verification. We'll verify it soon.");
      setDraft(DEFAULT_DRAFT);
      setTempDocFiles([]);
      setTempUploadedImages([]);
      setTempImageFiles([]);
      setView(user.role === 'admin' ? 'admin-dashboard' : 'owner-dashboard');
    } catch (error) {
      console.error("Firebase Error:", error);
      alert("Error saving! Check your internet or Firebase Rules.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // R4 verification panel (PRD §5): the checklist is the gate. Approve is
  // enabled only when every row passes; the admin's judgment on document
  // adequacy is exercised by reviewing the linked documents before approving.
  const openVerifyPanel = async (hostel: Hostel) => {
    setVerifyHostel(hostel);
    setVerifyDocs([]);
    setVerifyOwnerPhone('');
    setRejectReason('');
    setVerifyLoading(true);
    try {
      const [urls, owner] = await Promise.all([
        fetchVerificationDocs(hostel.id),
        fetchProfile(hostel.ownerId),
      ]);
      setVerifyDocs(urls);
      setVerifyOwnerPhone(owner?.phone ?? '');
    } catch { /* panel still renders with computed rows */ }
    finally { setVerifyLoading(false); }
  };
  const handleMarkReachable = async () => {
    if (!verifyHostel) return;
    try {
      await updateDoc(doc(db, "hostels", verifyHostel.id), { ownerReachable: true, updatedAt: serverTimestamp() });
      setHostels(prev => prev.map(h => h.id === verifyHostel.id ? { ...h, ownerReachable: true } : h));
      setVerifyHostel({ ...verifyHostel, ownerReachable: true });
    } catch (error) {
      console.error("Reachable error:", error);
      alert("Could not save the reachable-owner check.");
    }
  };
  const handleRejectWithReason = async () => {
    if (!verifyHostel || !rejectReason.trim()) {
      alert("Please write a rejection reason — the owner will see it.");
      return;
    }
    try {
      await updateDoc(doc(db, "hostels", verifyHostel.id), { status: 'rejected', rejectionReason: rejectReason.trim(), updatedAt: serverTimestamp() });
      setHostels(prev => prev.map(h => h.id === verifyHostel.id ? { ...h, status: 'rejected', rejectionReason: rejectReason.trim() } : h));
      setVerifyHostel(null);
      setRejectReason('');
    } catch (error) {
      console.error("Reject error:", error);
      alert("Could not reject the listing.");
    }
  };
  const handleResubmit = async (id: string) => {
    try {
      await updateDoc(doc(db, "hostels", id), { status: 'pending', updatedAt: serverTimestamp() });
      setHostels(prev => prev.map(h => h.id === id ? { ...h, status: 'pending' } : h));
    } catch (error) {
      console.error("Resubmit error:", error);
      alert("Could not resubmit the listing.");
    }
  };

  // Owner loop (PRD §7.3): pause a live listing, or send a paused listing
  // back for re-review. Owners may never approve their own listing — the
  // rules enforce that; this handler only offers the two owner-safe moves.
  const handleListingStatusChange = async (id: string, newStatus: 'paused' | 'pending') => {
    try {
      await updateDoc(doc(db, "hostels", id), { status: newStatus, updatedAt: serverTimestamp() });
      setHostels(prev => prev.map(h => h.id === id ? { ...h, status: newStatus } : h));
    } catch (error) {
      console.error("Status error:", error);
      alert("Could not change the listing status.");
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
                      placeholder={t.searchHostels} aria-label="Search hostels by name or area" 
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-base outline-none font-medium"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 md:flex gap-4">
                    <select 
                      className="flex-grow md:min-w-[180px] p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      value={genderFilter} aria-label="Filter by gender"
                      onChange={(e) => setGenderFilter(e.target.value as Gender | 'All')}
                    >
                      <option value="All">All Genders</option>
                      <option value="boys">{t.boys}</option>
                      <option value="girls">{t.girls}</option>
                    </select>
                    <select
                      className="flex-grow md:min-w-[180px] p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      value={sortBy} aria-label="Sort listings"
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    >
                      <option value="recommended">Sort: Newest Verified</option>
                      <option value="rent-asc">Rent: Low to High</option>
                      <option value="rent-desc">Rent: High to Low</option>
                      <option value="distance">Nearest to COMSATS</option>
                      <option value="beds">Most Beds Free</option>
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

                {/* R6: room type, amenities, availability, COMSATS preset, favourites, map */}
                <div className="pt-2 space-y-4">
                  <div className="flex flex-wrap gap-3 items-center">
                    <select
                      className="p-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      value={roomTypeFilter} aria-label="Filter by room type"
                      onChange={(e) => setRoomTypeFilter(e.target.value as RoomType | 'All')}
                    >
                      <option value="All">All Room Types</option>
                      <option value="single">Single</option>
                      <option value="shared-2">Shared (2)</option>
                      <option value="shared-3">Shared (3)</option>
                      <option value="dorm">Dorm</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={bedsOnlyFilter} onChange={(e) => setBedsOnlyFilter(e.target.checked)} className="w-4 h-4 accent-blue-600" /> Beds available now
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={nearComsatsFilter} onChange={(e) => setNearComsatsFilter(e.target.checked)} className="w-4 h-4 accent-blue-600" /> Near COMSATS (≤ 2 km)
                    </label>
                    {user && (
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={favOnlyFilter} onChange={(e) => setFavOnlyFilter(e.target.checked)} className="w-4 h-4 accent-blue-600" /> Favourites only
                      </label>
                    )}
                    <Button variant={showMap ? 'secondary' : 'outline'} className="rounded-2xl gap-2" onClick={() => setShowMap(!showMap)}>
                      <MapIcon className="w-4 h-4" /> {showMap ? 'Hide Map' : 'Show Map'}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-black uppercase text-gray-400 tracking-widest py-2">Amenities:</span>
                    {(['wifi', 'mess', 'backup-power', 'laundry', 'attached-bath', 'security', 'parking', 'study-room'] as Amenity[]).map(a => (
                      <button key={a} type="button" aria-pressed={amenityFilters.includes(a)}
                        onClick={() => setAmenityFilters(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
                        className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${amenityFilters.includes(a) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{a}</button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {showMap && (
              <section className="max-w-7xl mx-auto px-4 pt-8">
                <Suspense fallback={<div className="w-full h-[420px] rounded-[2rem] bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-400">Loading map…</div>}>
                  <HostelMap hostels={sortedHostels} onOpen={openHostel} />
                </Suspense>
              </section>
            )}

            {/* Grid */}
            <section className="max-w-7xl mx-auto px-4 py-16">
              {sortedHostels.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sortedHostels.map(h => (
<HostelCard hostel={h} avgRating={getAvgRating(h.id)} onOpen={openHostel} isFavourite={favourites.has(h.id)} onToggleFavourite={handleToggleFavourite} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-gray-200">
                  <AlertCircle className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-400">No Hostels Found</h3>
                  <p className="text-gray-400 mt-2">Try adjusting your budget or search terms.</p>
                  <Button variant="ghost" className="mt-4" onClick={() => { setSearchQuery(''); setGenderFilter('All'); setMaxRentFilter(100000); setRoomTypeFilter('All'); setAmenityFilters([]); setBedsOnlyFilter(false); setNearComsatsFilter(false); setFavOnlyFilter(false); }}>Clear Filters</Button>
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
            <button className="mb-8 flex items-center gap-1 text-sm font-black text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest" onClick={navigateHome}>
              <ChevronLeft className="w-5 h-5" /> {t.searchHostels}
            </button>

            <div className="space-y-10">
               <div className="aspect-[16/9] md:aspect-[21/9] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-white">
                  <img src={selectedHostel.photos[0] || 'https://picsum.photos/seed/hostela/800/600'} className="w-full h-full object-cover" alt={selectedHostel.name} />
               </div>
               {selectedHostel.photos.length > 1 && (
                 <div className="flex gap-3 overflow-x-auto pb-2">
                   {selectedHostel.photos.slice(1).map((p, idx) => (
                     <img key={idx} src={p} className="w-40 h-28 rounded-2xl object-cover border-2 border-white shadow-sm flex-shrink-0" alt={`${selectedHostel.name} photo ${idx + 2}`} />
                   ))}
                 </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="md:col-span-2 space-y-10">
                     <div className="bg-white p-8 md:p-10 rounded-[2rem] border border-gray-100 shadow-sm">
                        <div className="flex flex-wrap gap-2 mb-4">
                          {selectedHostel.status === 'live' && (
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">{t.verified}</span>
                          )}
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full">{selectedHostel.gender === 'boys' ? 'Boys' : 'Girls'}</span>
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-full">{distanceKm(COMSATS.latitude, COMSATS.longitude, selectedHostel.latitude, selectedHostel.longitude)} km from COMSATS</span>
                          <button type="button" onClick={() => handleToggleFavourite(selectedHostel)} aria-pressed={favourites.has(selectedHostel.id)}
                            className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 ${favourites.has(selectedHostel.id) ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                            <Heart className={`w-3 h-3 ${favourites.has(selectedHostel.id) ? 'fill-current' : ''}`} /> {favourites.has(selectedHostel.id) ? 'Saved' : 'Save'}
                          </button>
                        </div>
                        <h2 className="text-3xl font-black mb-2 text-gray-900">{selectedHostel.name}</h2>
                        <p className="text-sm font-bold text-gray-500 mb-6">{selectedHostel.area} • {selectedHostel.address}</p>
                        <p className="text-gray-600 leading-relaxed text-lg">{selectedHostel.description}</p>

                        <div className="grid grid-cols-2 gap-8 mt-10 pt-10 border-t border-gray-50">
                           <div className="space-y-1">
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Per bed / month</p>
                              <p className="text-xl font-black text-gray-900">PKR {selectedHostel.pricePerBedMonthly.toLocaleString()}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Mess</p>
                              <p className="text-xl font-black text-gray-900">{selectedHostel.messAvailable ? `PKR ${selectedHostel.messPriceMonthly.toLocaleString()} / month` : 'No mess'}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Security deposit</p>
                              <p className="text-xl font-black text-gray-900">PKR {selectedHostel.securityDeposit.toLocaleString()}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Other charges</p>
                              <p className="text-xl font-black text-gray-900">{selectedHostel.otherChargesNote || 'None stated'}</p>
                           </div>
                        </div>
                     </div>

                     <div className="bg-white p-8 md:p-10 rounded-[2rem] border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-black mb-8 text-gray-900">{t.availability}</h2>
                        <div className="grid grid-cols-3 gap-4 text-center">
                           <div className="p-4 bg-gray-50 rounded-2xl">
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total beds</p>
                              <p className="text-2xl font-black text-gray-900">{selectedHostel.totalBeds}</p>
                           </div>
                           <div className="p-4 bg-gray-50 rounded-2xl">
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Beds free</p>
                              <p className="text-2xl font-black text-green-600">{selectedHostel.bedsAvailable}</p>
                           </div>
                           <div className="p-4 bg-gray-50 rounded-2xl">
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Available from</p>
                              <p className="text-sm font-black text-gray-900 mt-1">{selectedHostel.availableFrom || '—'}</p>
                           </div>
                        </div>
                        {selectedHostel.roomTypes.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-6">
                            {selectedHostel.roomTypes.map(rt => (
                              <span key={rt} className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full">{rt}</span>
                            ))}
                          </div>
                        )}
                        {selectedHostel.amenities.length > 0 && (
                          <div className="mt-8">
                            <h3 className="text-sm font-black text-gray-900 mb-3">Amenities</h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedHostel.amenities.map(a => (
                                <span key={a} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">{a}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedHostel.rules && (
                          <div className="mt-8">
                            <h3 className="text-sm font-black text-gray-900 mb-3">House rules</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">{selectedHostel.rules}</p>
                          </div>
                        )}
                     </div>

                     <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                           <h2 className="text-xl font-black text-gray-900">Location</h2>
                           <a
                             href={`https://www.openstreetmap.org/?mlat=${selectedHostel.latitude}&mlon=${selectedHostel.longitude}#map=16/${selectedHostel.latitude}/${selectedHostel.longitude}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="flex items-center gap-2 text-xs font-black text-blue-600 bg-blue-50 px-3 py-2 rounded-xl hover:bg-blue-100 transition-all"
                           >
                             <ExternalLink className="w-3 h-3" /> View on OpenStreetMap
                           </a>
                        </div>
                        <div className="aspect-video rounded-[1.5rem] overflow-hidden border-2 border-gray-50">
                           <iframe
                             title={`Map of ${selectedHostel.name}`}
                             src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedHostel.longitude - 0.01}%2C${selectedHostel.latitude - 0.01}%2C${selectedHostel.longitude + 0.01}%2C${selectedHostel.latitude + 0.01}&layer=mapnik&marker=${selectedHostel.latitude}%2C${selectedHostel.longitude}`}
                             width="100%"
                             height="100%"
                             className="border-none"
                             loading="lazy"
                           ></iframe>
                        </div>
                     </div>

                     <ReviewsSection hostel={selectedHostel} reviews={reviews} t={t} user={user} stayedInquiry={stayedInquiry} myReview={myReviewForSelected} reviewRating={reviewRating} onRatingChange={setReviewRating} reviewComment={reviewComment} onCommentChange={setReviewComment} onSubmitReview={handleStudentAddReview} onSignIn={() => setView('login')} />
                  </div>

<InquiryPanel hostel={selectedHostel} user={user} sent={inquirySent} busy={inquiryBusy} message={inquiryMessage} onMessageChange={setInquiryMessage} phone={inquiryPhone} onPhoneChange={setInquiryPhone} moveIn={inquiryMoveIn} onMoveInChange={setInquiryMoveIn} bedsNeeded={inquiryBeds} onBedsChange={setInquiryBeds} ownerPhone={ownerPhone} onSubmitInquiry={handleSubmitInquiry} onSignIn={() => setView('login')} />
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
                    <h2 className="text-4xl font-black text-gray-900">{user?.role === 'admin' ? t.adminPortal : t.ownerPortal}</h2>
                    <p className="text-gray-500 mt-2 font-medium">Manage properties and room availability.</p>
                 </div>
                 <div className="flex flex-wrap gap-3">
                   {user?.role === 'admin' && (
                     <Button variant="outline" onClick={handleSeedListings} size="lg" className="rounded-2xl gap-2">Load Islamabad Demo Listings</Button>
                   )}
                   {seedMsg && <p className="w-full text-xs font-semibold text-gray-500">{seedMsg}</p>}
                   <Button onClick={() => setView('add-hostel')} size="lg" className="rounded-2xl gap-2 shadow-xl shadow-blue-100"><Plus className="w-5 h-5" /> {t.addHostel}</Button>
                 </div>
              </div>

              {/* R4: dashboard counts */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                 <div className="p-5 bg-white rounded-2xl border border-gray-100"><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Live listings</p><p className="text-3xl font-black text-green-600">{displayedHostels.filter(h => h.status === 'live').length}</p></div>
                 <div className="p-5 bg-white rounded-2xl border border-gray-100"><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Pending review</p><p className="text-3xl font-black text-yellow-600">{displayedHostels.filter(h => h.status === 'pending').length}</p></div>
                 <div className="p-5 bg-white rounded-2xl border border-gray-100"><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Paused / Suspended</p><p className="text-3xl font-black text-gray-900">{displayedHostels.filter(h => h.status === 'paused' || h.status === 'suspended').length}</p></div>
                 {user?.role === 'admin' ? (
                   <div className="p-5 bg-white rounded-2xl border border-gray-100"><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Accounts / New inquiries</p><p className="text-3xl font-black text-blue-600">{usersCount} / {inquiries.filter(i => i.status === 'new').length}</p></div>
                 ) : (
                   <div className="p-5 bg-white rounded-2xl border border-gray-100"><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">New inquiries</p><p className="text-3xl font-black text-blue-600">{inquiries.filter(i => i.status === 'new').length}</p></div>
                 )}
              </div>

              <div className="grid grid-cols-1 gap-8">
                {user?.role === 'owner' && user?.status === 'suspended' && (
                  <div className="p-5 bg-yellow-50 border-2 border-yellow-100 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                    <p className="text-sm font-bold text-yellow-800">Your account is suspended. Your listings are hidden from public search until an admin reinstates your account.</p>
                  </div>
                )}
                {/* R4: verification checklist panel (PRD §5) */}
              {user?.role === 'admin' && verifyHostel && (() => {
                const h = verifyHostel;
                const { fieldsOk, photosOk, docsOk, reachableOk, missing, allOk } = evaluateChecklist(h);
                const row = (ok: boolean, label: string, detail: string) => (
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{ok ? '✓' : '✗'}</span>
                    <div><p className="text-sm font-black text-gray-900">{label}</p><p className="text-xs font-medium text-gray-500">{detail}</p></div>
                  </div>
                );
                return (
                  <div className="mb-12 bg-white p-8 rounded-[2.5rem] border-2 border-blue-100 shadow-xl space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-black text-gray-900">Verification checklist — {h.name}</h3>
                        <p className="text-sm text-gray-500 font-medium">{h.area} • {h.gender === 'boys' ? 'Boys' : 'Girls'} • Approve is enabled only when every row passes.</p>
                      </div>
                      <button className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors" onClick={() => setVerifyHostel(null)}><X className="w-5 h-5" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {row(fieldsOk, 'Required fields complete', 'Name, area, address, price above 0, beds, available-from date.')}
                      {row(photosOk, 'At least 3 photos', `${h.photos.length} photo(s) on the listing.`)}
                      {row(docsOk, 'Verification documents on file', docsOk ? 'Owner uploaded documents — review them below before approving.' : 'No documents uploaded yet. Ask the owner to upload CNIC + right-to-list proof.')}
                      {row(reachableOk, 'Owner reachable test', verifyOwnerPhone ? `Owner phone on file: ${verifyOwnerPhone}. Call or message to confirm they are reachable, then mark it.` : 'No phone on the owner profile — the owner must add one.')}
                    </div>
                    {verifyLoading ? (
                      <p className="text-xs font-bold text-gray-400">Loading documents…</p>
                    ) : verifyDocs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Verification documents (admin-only links)</p>
                        <div className="flex flex-wrap gap-2">
                          {verifyDocs.map((u, i) => (
                            <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-50 text-blue-700 text-xs font-black rounded-xl hover:bg-blue-100">Document {i + 1}</a>
                          ))}
                        </div>
                        <p className="text-xs font-medium text-gray-500">Approve only if the CNIC and right-to-list proof look satisfactory. These links are never shown on the public listing.</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {!reachableOk && (
                        <Button variant="outline" className="rounded-xl" onClick={handleMarkReachable}>Mark owner reachable</Button>
                      )}
                      <Button variant="secondary" className="rounded-xl" disabled={!allOk} onClick={() => { handleHostelStatusChange(h.id, 'live'); setVerifyHostel(null); }}>Approve &amp; publish</Button>
                    </div>
                    {!allOk && (
                      <p className="text-xs font-bold text-red-600">Approval blocked — missing: {missing.join(', ')}.</p>
                    )}
                    <div className="pt-6 border-t border-gray-100 space-y-3">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Rejection reason (shown to the owner)</label>
                      <textarea rows={2} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Photos do not match the address, or no CNIC uploaded."
                        value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                      <Button variant="danger" className="rounded-xl" onClick={handleRejectWithReason}>Reject with reason</Button>
                    </div>
                  </div>
                );
              })()}

              {/* --- START OF VERIFICATION DASHBOARD MODIFICATION --- */}
{user?.role === 'admin' && hostels.filter(h => h.status === 'pending').length > 0 && (
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
            <img src={h.photos[0] || 'https://picsum.photos/seed/hostela/800/600'} className="w-16 h-16 rounded-xl object-cover" alt="" />
            <div>
              <p className="font-bold text-gray-900">{h.name}</p>
              <p className="text-xs text-gray-400 uppercase font-black tracking-widest">{h.area} • {h.gender === 'boys' ? 'Boys' : 'Girls'}</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button
              fullWidth
              variant="secondary"
              className="rounded-xl"
              onClick={() => openVerifyPanel(h)}
            >
              Review &amp; verify
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
                        <img src={h.photos[0] || 'https://picsum.photos/seed/hostela/800/600'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                      </div>
                      <div className="flex-grow space-y-6 w-full">
                         <div className="flex justify-between items-start">
                            <div className="space-y-1">
                               <div className="flex items-center gap-2">
                                  <h3 className="text-2xl font-black text-gray-900">{h.name}</h3>
                                  <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                    h.status === 'live' ? 'bg-green-100 text-green-700' :
                                    h.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    h.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'
                                  }`}>{h.status}</span>
                               </div>
                               <p className="text-xs text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                 <MapPin className="w-3 h-3" /> {h.area} • {h.gender === 'boys' ? 'Boys' : 'Girls'}
                               </p>
                               {h.status === 'rejected' && h.rejectionReason && (
                                 <p className="text-xs font-bold text-red-600">Rejected: {h.rejectionReason}</p>
                               )}
                            </div>
                            <div className="flex gap-2">
                               {user?.role === 'admin' && (
                                 <>
                                   {h.status === 'pending' && (
                                      <Button size="sm" variant="secondary" onClick={() => openVerifyPanel(h)} className="rounded-xl px-4">Verify</Button>
                                   )}
                                   {h.status === 'live' && (
                                      <Button size="sm" variant="outline" onClick={() => handleHostelStatusChange(h.id, 'suspended')} className="rounded-xl px-4">Suspend</Button>
                                   )}
                                   {h.status === 'suspended' && (
                                      <Button size="sm" variant="secondary" onClick={() => handleHostelStatusChange(h.id, 'live')} className="rounded-xl px-4">Reinstate</Button>
                                   )}
                                   {pendingDeleteId === h.id ? (
                                     <>
                                       <Button size="sm" variant="danger" onClick={() => handleDeleteHostel(h.id)} className="rounded-xl px-4">Confirm delete?</Button>
                                       <Button size="sm" variant="outline" onClick={() => setPendingDeleteId(null)} className="rounded-xl px-4">Cancel</Button>
                                     </>
                                   ) : (
                                     <Button size="sm" variant="danger" onClick={() => handleDeleteHostel(h.id)} className="rounded-xl px-4"><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
                                   )}
                                 </>
                               )}
                               <Button size="sm" variant="outline" onClick={() => handleEditHostel(h)} className="rounded-xl px-4"><Settings className="w-4 h-4 mr-1" /> Edit</Button>
                               {user?.role === 'owner' && h.status === 'rejected' && (
                                 <Button size="sm" variant="secondary" onClick={() => handleResubmit(h.id)} className="rounded-xl px-4">Resubmit</Button>
                               )}
                               {h.status === 'live' && (
                                 <Button size="sm" variant="outline" onClick={() => handleListingStatusChange(h.id, 'paused')} className="rounded-xl px-4">Pause</Button>
                               )}
                               {h.status === 'paused' && (
                                 <Button size="sm" variant="secondary" onClick={() => handleListingStatusChange(h.id, 'pending')} className="rounded-xl px-4">Request re-review</Button>
                               )}
                            </div>
                         </div>
                         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                               <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Total Beds</p>
                               <p className="text-lg font-black text-gray-900">{h.totalBeds}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                               <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Beds Free</p>
                               <p className="text-lg font-black text-green-600">{h.bedsAvailable}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                               <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Per Bed / Month</p>
                               <p className="text-lg font-black text-blue-600">Rs. {h.pricePerBedMonthly.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                               <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Deposit</p>
                               <p className="text-lg font-black text-gray-900">Rs. {h.securityDeposit.toLocaleString()}</p>
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
                    <button className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors" onClick={() => setView(user?.role === 'admin' ? 'admin-dashboard' : 'owner-dashboard')}>
                      <X className="w-6 h-6" />
                    </button>
                 </div>

                 {user?.role === 'owner' && (
                    <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                       <Info className="w-5 h-5 text-blue-600" />
                       <p className="text-xs font-bold text-blue-800">You can edit pricing, beds and availability. Changing the name, area or address sends the listing back for admin verification.</p>
                    </div>
                 )}

                 <form className="space-y-8" onSubmit={saveHostelChanges}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Hostel Name</label>
                          <input type="text" className={`w-full p-4 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none ${user?.role === 'owner' ? 'bg-gray-100 opacity-70 cursor-not-allowed' : 'bg-gray-50'}`}
                            value={editHostelData.name} disabled={user?.role === 'owner'}
                            onChange={(e) => setEditHostelData({ ...editHostelData, name: e.target.value })} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Area</label>
                          <input type="text" className={`w-full p-4 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none ${user?.role === 'owner' ? 'bg-gray-100 opacity-70 cursor-not-allowed' : 'bg-gray-50'}`}
                            value={editHostelData.area} disabled={user?.role === 'owner'}
                            onChange={(e) => setEditHostelData({ ...editHostelData, area: e.target.value })} />
                       </div>
                       <div className="space-y-2 md:col-span-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Full Address</label>
                          <input type="text" className={`w-full p-4 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none ${user?.role === 'owner' ? 'bg-gray-100 opacity-70 cursor-not-allowed' : 'bg-gray-50'}`}
                            value={editHostelData.address} disabled={user?.role === 'owner'}
                            onChange={(e) => setEditHostelData({ ...editHostelData, address: e.target.value })} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Price per bed / month (PKR)</label>
                          <input type="number" min={0} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editHostelData.pricePerBedMonthly}
                            onChange={(e) => setEditHostelData({ ...editHostelData, pricePerBedMonthly: Number(e.target.value) })} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Security deposit (PKR)</label>
                          <input type="number" min={0} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editHostelData.securityDeposit}
                            onChange={(e) => setEditHostelData({ ...editHostelData, securityDeposit: Number(e.target.value) })} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total beds</label>
                          <input type="number" min={0} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editHostelData.totalBeds}
                            onChange={(e) => setEditHostelData({ ...editHostelData, totalBeds: Number(e.target.value) })} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Beds available</label>
                          <input type="number" min={0} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editHostelData.bedsAvailable}
                            onChange={(e) => setEditHostelData({ ...editHostelData, bedsAvailable: Number(e.target.value) })} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Available from</label>
                          <input type="date" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editHostelData.availableFrom}
                            onChange={(e) => setEditHostelData({ ...editHostelData, availableFrom: e.target.value })} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Mess price / month (PKR, 0 = no mess)</label>
                          <input type="number" min={0} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editHostelData.messPriceMonthly}
                            onChange={(e) => setEditHostelData({ ...editHostelData, messPriceMonthly: Number(e.target.value), messAvailable: Number(e.target.value) > 0 })} />
                       </div>
                       <div className="space-y-2 md:col-span-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Description</label>
                          <textarea rows={3} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editHostelData.description}
                            onChange={(e) => setEditHostelData({ ...editHostelData, description: e.target.value })} />
                       </div>
                       <div className="space-y-2 md:col-span-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">House rules</label>
                          <textarea rows={2} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editHostelData.rules}
                            onChange={(e) => setEditHostelData({ ...editHostelData, rules: e.target.value })} />
                       </div>
                    </div>
                    <div className="space-y-6 pt-8 border-t border-gray-100">
                       <h3 className="text-xl font-black text-gray-900">Listing photos</h3>
                       <div className="flex gap-3 overflow-x-auto pb-2">
                          {editHostelData.photos.map((p, idx) => (
                            <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                               <img src={p} className="w-full h-full object-cover" alt="" />
                               <button type="button" className="absolute top-0 right-0 p-1 bg-red-600 text-white" onClick={() => setEditHostelData({ ...editHostelData, photos: editHostelData.photos.filter((_, i) => i !== idx) })}><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                          <label className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-colors cursor-pointer flex-shrink-0">
                             <Camera className="w-5 h-5" />
                             <span className="text-[8px] font-black uppercase mt-1">{editMediaBusy ? 'Uploading…' : 'Add'}</span>
                             <input type="file" multiple accept="image/*" className="hidden" disabled={editMediaBusy} onChange={async (e) => {
                               const files = e.target.files; if (!files || !user) return;
                               setEditMediaBusy(true);
                               try {
                                 const urls = await uploadHostelPhotos(user.id, Array.from(files));
                                 setEditHostelData(prev => prev ? { ...prev, photos: [...prev.photos, ...urls] } : prev);
                               } catch (err) { console.error("Photo upload failed:", err); alert("Could not upload those photos. Try again."); }
                               finally { setEditMediaBusy(false); e.target.value = ''; }
                             }} />
                          </label>
                       </div>
                       <p className="text-xs font-bold text-gray-500">Photos save with the form below. Aim for 3–10 photos before approval.</p>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Verification documents (CNIC, right-to-list proof)</label>
                          <div className="flex items-center gap-3">
                             <label className="px-5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-gray-100">
                                {editMediaBusy ? 'Uploading…' : 'Upload documents'}
                                <input type="file" multiple accept="image/*,application/pdf" className="hidden" disabled={editMediaBusy} onChange={async (e) => {
                                  const files = e.target.files; if (!files || !user || !editHostelData) return;
                                  setEditMediaBusy(true);
                                  try {
                                    const urls = await uploadVerificationDocs(user.id, Array.from(files));
                                    await saveVerificationDocs(editHostelData.id, user.id, urls);
                                    await updateDoc(doc(db, "hostels", editHostelData.id), { hasVerificationDocs: true, updatedAt: serverTimestamp() });
                                    setEditHostelData(prev => prev ? { ...prev, hasVerificationDocs: true } : prev);
                                    alert("Verification documents uploaded — visible only to you and the admin.");
                                  } catch (err) { console.error("Doc upload failed:", err); alert("Could not upload those documents. Try again."); }
                                  finally { setEditMediaBusy(false); e.target.value = ''; }
                                }} />
                             </label>
                             <span className="text-xs font-bold text-gray-500">{editHostelData.hasVerificationDocs ? 'Documents on file' : 'None on file yet'}</span>
                          </div>
                       </div>
                    </div>
                    <Button fullWidth size="lg" className="rounded-2xl py-5 shadow-xl shadow-blue-100">Save Changes</Button>
                 </form>
              </div>
           </div>
        )}

        {view === 'add-hostel' && (
           <div className="max-w-4xl mx-auto py-12 px-4 animate-in slide-in-from-right duration-500">
              <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-2xl space-y-10">
                 <div className="text-center space-y-3">
                    <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto">
                       <Plus className="w-10 h-10 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900">List New Property</h2>
                    <p className="text-gray-500 font-medium">Fill in every field — students compare listings on exactly these details.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Hostel Name *</label>
                     <input type="text" placeholder="e.g. Blue Sky Residence" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                       value={draft.name} onChange={(e) => setDraftField('name', e.target.value)} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Area *</label>
                     <input type="text" placeholder="e.g. Chak Shahzad" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                       value={draft.area} onChange={(e) => setDraftField('area', e.target.value)} />
                   </div>
                   <div className="space-y-2 md:col-span-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Full Address *</label>
                     <input type="text" placeholder="Street, sector, nearby landmark" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                       value={draft.address} onChange={(e) => setDraftField('address', e.target.value)} />
                   </div>
                   <div className="space-y-2 md:col-span-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Description</label>
                     <textarea rows={3} placeholder="What makes this hostel good for students?" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                       value={draft.description} onChange={(e) => setDraftField('description', e.target.value)} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">For *</label>
                     <select className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                       value={draft.gender} onChange={(e) => setDraftField('gender', e.target.value as Gender)}>
                       <option value="boys">Boys</option>
                       <option value="girls">Girls</option>
                     </select>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Room types * (pick at least one)</label>
                     <div className="flex flex-wrap gap-2 pt-2">
                       {(['single', 'shared-2', 'shared-3', 'dorm'] as RoomType[]).map(rt => (
                         <button key={rt} type="button" onClick={() => toggleDraftList('roomTypes', rt)}
                           className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${draft.roomTypes.includes(rt) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{rt}</button>
                       ))}
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Price per bed / month (PKR) *</label>
                     <input type="number" min={0} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                       value={draft.pricePerBedMonthly} onChange={(e) => setDraftField('pricePerBedMonthly', Number(e.target.value))} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Security deposit (PKR)</label>
                     <input type="number" min={0} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                       value={draft.securityDeposit} onChange={(e) => setDraftField('securityDeposit', Number(e.target.value))} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Mess</label>
                     <div className="flex items-center gap-3 pt-2">
                       <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={draft.messAvailable} onChange={(e) => setDraftField('messAvailable', e.target.checked)} />
                       <span className="text-sm font-bold text-gray-700">Mess available</span>
                       {draft.messAvailable && (
                         <input type="number" min={0} aria-label="Mess price" className="flex-1 p-3 bg-gray-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                           value={draft.messPriceMonthly} onChange={(e) => setDraftField('messPriceMonthly', Number(e.target.value))} />
                       )}
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Other charges note</label>
                     <input type="text" placeholder="e.g. Admission charges Rs 5,000 one-time" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                       value={draft.otherChargesNote} onChange={(e) => setDraftField('otherChargesNote', e.target.value)} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Total beds *</label>
                     <input type="number" min={1} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                       value={draft.totalBeds} onChange={(e) => setDraftField('totalBeds', Number(e.target.value))} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Beds available *</label>
                     <input type="number" min={0} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                       value={draft.bedsAvailable} onChange={(e) => setDraftField('bedsAvailable', Number(e.target.value))} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Available from *</label>
                     <input type="date" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                       value={draft.availableFrom} onChange={(e) => setDraftField('availableFrom', e.target.value)} />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Map pin (latitude / longitude)</label>
                     <div className="flex gap-2">
                       <input type="number" step="0.0001" aria-label="Latitude" className="flex-1 p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                         value={draft.latitude} onChange={(e) => setDraftField('latitude', Number(e.target.value))} />
                       <input type="number" step="0.0001" aria-label="Longitude" className="flex-1 p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                         value={draft.longitude} onChange={(e) => setDraftField('longitude', Number(e.target.value))} />
                     </div>
                     <button type="button" className="text-xs font-bold text-blue-600" onClick={() => { setDraftField('latitude', COMSATS.latitude); setDraftField('longitude', COMSATS.longitude); }}>Use COMSATS campus pin</button>
                   </div>
                   <div className="space-y-2 md:col-span-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Amenities</label>
                     <div className="flex flex-wrap gap-2 pt-2">
                       {(['wifi', 'mess', 'backup-power', 'laundry', 'attached-bath', 'security', 'parking', 'study-room'] as Amenity[]).map(a => (
                         <button key={a} type="button" onClick={() => toggleDraftList('amenities', a)}
                           className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${draft.amenities.includes(a) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{a}</button>
                       ))}
                     </div>
                   </div>
                   <div className="space-y-2 md:col-span-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">House rules</label>
                     <textarea rows={2} placeholder="e.g. Visitors till 9 pm. Quiet hours after 11 pm." className="w-full p-4 bg-gray-50 border-none rounded-2xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                       value={draft.rules} onChange={(e) => setDraftField('rules', e.target.value)} />
                   </div>
                   <div className="space-y-2 md:col-span-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Other nearby universities (comma-separated; COMSATS is always included)</label>
                     <input type="text" placeholder="e.g. NUST, Quaid-i-Azam University" className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                       value={draft.nearbyExtra} onChange={(e) => setDraftField('nearbyExtra', e.target.value)} />
                   </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Upload Facility Photos</label>
                       <span className="text-[10px] font-bold text-blue-600">Uploads to Cloudinary</span>
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
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                       <p className="text-xs font-bold text-blue-800 leading-relaxed">Photos upload to Cloudinary. Aim for 3–10 photos; verification documents below are visible only to you and the admin — never on the public listing.</p>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Verification documents (CNIC, right-to-list proof)</label>
                       <div className="flex items-center gap-3">
                          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => docInputRef.current?.click()}>Choose files</Button>
                          <span className="text-xs font-bold text-gray-500">{tempDocFiles.length > 0 ? tempDocFiles.map(f => f.name).join(', ') : 'No files chosen'}</span>
                       </div>
                       <input type="file" multiple accept="image/*,application/pdf" className="hidden" ref={docInputRef} onChange={(e) => { const f = e.target.files; if (f) setTempDocFiles(Array.from(f)); }} />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <Button fullWidth size="lg" disabled={isSubmitting} className="rounded-2xl py-6 shadow-xl shadow-blue-100 text-lg" onClick={handleSubmitListing}>{isSubmitting ? 'Submitting…' : 'Submit for Verification'}</Button>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] text-center">Listings are reviewed by an admin before they go live</p>
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
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Phone number</label>
                         <input type="tel" required
                           className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                           value={authPhone} onChange={(e) => setAuthPhone(e.target.value)}
                           placeholder="03XX-XXXXXXX" />
                         <p className="text-[10px] text-gray-400 font-bold px-1">Required — owners reply to inquiries on this number.</p>
                      </div>
                    )}
                    {view === 'signup' && authRole === 'student' && (
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">University (optional)</label>
                         <input type="text"
                           className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                           value={authUniversity} onChange={(e) => setAuthUniversity(e.target.value)}
                           placeholder="e.g. COMSATS University Islamabad" />
                      </div>
                    )}
                    {view === 'signup' && (
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">I am a</label>
                         <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => setAuthRole('student')} className={`py-3 rounded-2xl font-bold border-2 transition-all ${authRole === 'student' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>Student</button>
                            <button type="button" onClick={() => setAuthRole('owner')} className={`py-3 rounded-2xl font-bold border-2 transition-all ${authRole === 'owner' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>Hostel Owner</button>
                         </div>
                         {authRole === 'owner' && (
                           <p className="text-[10px] text-gray-400 font-bold px-1">Owners submit listings for admin verification before they go live.</p>
                         )}
                      </div>
                    )}
                    {authError && (
                      <div className="p-3 bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 border border-red-100">
                        <AlertCircle className="w-4 h-4" /> {authError}
                      </div>
                    )}
                    {view === 'login' && (
                      <button type="button" className="text-xs font-bold text-blue-600" onClick={handlePasswordReset}>Forgot password?</button>
                    )}
                    {authResetMsg && (
                      <div className="p-3 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-green-100">{authResetMsg}</div>
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
