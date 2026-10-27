import { useEffect, useRef } from 'react';
import type { Hostel } from './types';
import { COMSATS } from './types';

// R6: Leaflet + OpenStreetMap pin map (PRD §10). Loaded lazily so the
// Leaflet bundle only downloads when the student opens the map view.
export function HostelMap({ hostels, onOpen }: { hostels: Hostel[]; onOpen: (h: Hostel) => void }) {
  const divRef = useRef<HTMLDivElement>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    let map: import('leaflet').Map | null = null;
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');
      if (cancelled || !divRef.current) return;
      map = L.map(divRef.current).setView([COMSATS.latitude, COMSATS.longitude], 13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      const pin = (label: string, highlight: boolean) =>
        L.divIcon({
          className: '',
          html: `<div style="background:${highlight ? '#2563eb' : '#111827'};color:#fff;font-size:11px;font-weight:800;padding:4px 8px;border-radius:9999px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap;cursor:pointer">${label}</div>`,
        });
      L.marker([COMSATS.latitude, COMSATS.longitude], { icon: pin('COMSATS', true) })
        .addTo(map)
        .bindPopup('<b>COMSATS University Islamabad</b><br/>Chak Shahzad campus');
      hostels.forEach(h => {
        L.marker([h.latitude, h.longitude], { icon: pin(`Rs ${h.pricePerBedMonthly.toLocaleString()}`, false) })
          .addTo(map!)
          .bindPopup(`<b>${h.name}</b><br/>${h.area} • ${h.bedsAvailable} of ${h.totalBeds} beds free`)
          .on('click', () => onOpenRef.current(h));
      });
    })();
    return () => {
      cancelled = true;
      map?.remove();
      map = null;
    };
  }, [hostels]);

  return (
    <div
      ref={divRef}
      role="application"
      aria-label="Map of verified hostels near COMSATS Islamabad"
      className="w-full h-[420px] rounded-[2rem] border border-gray-100 shadow-sm z-0"
    />
  );
}
