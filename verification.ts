import type { Hostel } from './types';

// R4 verification checklist (PRD §5), as a pure function so the Admin HQ
// panel and the tests share exactly one definition of "verified".
// Approve is gated on all four rows passing; the admin's judgment on
// document adequacy is exercised by reviewing the linked documents
// before approving — the checklist only proves documents are on file.
export interface ChecklistResult {
  fieldsOk: boolean;
  photosOk: boolean;
  docsOk: boolean;
  reachableOk: boolean;
  missing: string[];
  allOk: boolean;
}

export function evaluateChecklist(h: Pick<Hostel,
  'name' | 'area' | 'address' | 'pricePerBedMonthly' | 'totalBeds' |
  'bedsAvailable' | 'availableFrom' | 'photos' | 'hasVerificationDocs' |
  'ownerReachable'>): ChecklistResult {
  const fieldsOk =
    h.name.trim().length > 2 &&
    !!h.area.trim() &&
    !!h.address.trim() &&
    h.pricePerBedMonthly > 0 &&
    h.totalBeds >= 1 &&
    h.bedsAvailable >= 0 &&
    h.bedsAvailable <= h.totalBeds &&
    !!h.availableFrom;
  const photosOk = h.photos.length >= 3;
  const docsOk = h.hasVerificationDocs;
  const reachableOk = h.ownerReachable;
  const missing = [
    ...(!fieldsOk ? ['Required fields complete'] : []),
    ...(!photosOk ? [`At least 3 photos (has ${h.photos.length})`] : []),
    ...(!docsOk ? ['Verification documents on file'] : []),
    ...(!reachableOk ? ['Owner reachable test'] : []),
  ];
  return { fieldsOk, photosOk, docsOk, reachableOk, missing, allOk: missing.length === 0 };
}
