import { describe, it, expect } from 'vitest';
import { evaluateChecklist } from './verification';

const base = {
  name: 'Test Lodge',
  area: 'Chak Shahzad',
  address: 'Test Street 1',
  pricePerBedMonthly: 12000,
  totalBeds: 5,
  bedsAvailable: 2,
  availableFrom: '2026-12-01',
  photos: ['a', 'b', 'c'],
  hasVerificationDocs: true,
  ownerReachable: true,
};

describe('evaluateChecklist (PRD §5)', () => {
  it('passes a complete listing', () => {
    const r = evaluateChecklist(base);
    expect(r.allOk).toBe(true);
    expect(r.missing).toEqual([]);
  });
  it('blocks approval when the owner-reachable test is missing', () => {
    const r = evaluateChecklist({ ...base, ownerReachable: false });
    expect(r.allOk).toBe(false);
    expect(r.missing).toEqual(['Owner reachable test']);
  });
  it('names every missing item at once', () => {
    const r = evaluateChecklist({ ...base, photos: ['a'], hasVerificationDocs: false, ownerReachable: false });
    expect(r.missing).toEqual([
      'At least 3 photos (has 1)',
      'Verification documents on file',
      'Owner reachable test',
    ]);
  });
  it('fails fields when beds free exceeds total beds or price is zero', () => {
    expect(evaluateChecklist({ ...base, bedsAvailable: 6 }).fieldsOk).toBe(false);
    expect(evaluateChecklist({ ...base, pricePerBedMonthly: 0 }).fieldsOk).toBe(false);
    expect(evaluateChecklist({ ...base, name: 'AB' }).fieldsOk).toBe(false);
  });
});
