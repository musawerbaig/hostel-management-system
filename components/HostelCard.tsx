import { MapPin, Star, ChevronLeft, BedDouble } from 'lucide-react';
import { COMSATS, distanceKm, type Hostel } from '../types';

interface Props {
  hostel: Hostel;
  avgRating: string; // 'New' when no visible reviews yet
  onOpen: (hostel: Hostel) => void;
}

// Listing card used in the home grid — PRD §7.1 fields only: cover photo,
// Verified badge, name, area, price per bed per month, mess note, distance
// to COMSATS, beds free, gender, room types.
export function HostelCard({ hostel, avgRating, onOpen }: Props) {
  const km = distanceKm(COMSATS.latitude, COMSATS.longitude, hostel.latitude, hostel.longitude);
  return (
    <article
      className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full"
      onClick={() => onOpen(hostel)}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={hostel.photos[0] || 'https://picsum.photos/seed/hostela/800/600'}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          alt={hostel.name}
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
            hostel.gender === 'boys' ? 'bg-blue-600 text-white' : 'bg-pink-500 text-white'
          }`}>
            {hostel.gender === 'boys' ? 'Boys' : 'Girls'}
          </span>
          {hostel.status === 'live' && (
            <span className="px-3 py-1 bg-green-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
              Verified
            </span>
          )}
        </div>
        {avgRating !== 'New' && (
          <div className="absolute bottom-4 left-4">
            <span className="px-3 py-1 bg-white/90 backdrop-blur text-[10px] font-black text-gray-900 rounded-full flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3 text-yellow-500 fill-current" /> {avgRating}
            </span>
          </div>
        )}
      </div>
      <div className="p-6 flex-grow flex flex-col space-y-3">
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{hostel.name}</h3>
        </div>
        <p className="flex items-center gap-1 text-gray-500 text-sm">
          <MapPin className="w-4 h-4 text-gray-400" /> {hostel.area} • {km} km from COMSATS
        </p>
        <p className="flex items-center gap-1 text-xs font-bold text-gray-600">
          <BedDouble className="w-4 h-4 text-gray-400" /> {hostel.bedsAvailable} of {hostel.totalBeds} beds free
          {hostel.roomTypes.length > 0 && ` • ${hostel.roomTypes.join(', ')}`}
        </p>
        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
              Per bed / month{hostel.messAvailable ? ` • Mess Rs. ${hostel.messPriceMonthly.toLocaleString()}` : ' • No mess'}
            </span>
            <span className="text-2xl font-black text-gray-900">Rs. {hostel.pricePerBedMonthly.toLocaleString()}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </div>
        </div>
      </div>
    </article>
  );
}
