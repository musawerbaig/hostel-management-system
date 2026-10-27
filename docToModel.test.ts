import { describe, it, expect } from 'vitest';
import { docToModel } from './services';

const fakeTimestamp = (iso: string) => ({ toDate: () => new Date(iso) });

describe('docToModel (Firestore Timestamps -> ISO strings)', () => {
  it('converts timestamp fields and keeps the id', () => {
    const out = docToModel('abc', {
      name: 'Test',
      createdAt: fakeTimestamp('2026-10-24T07:00:00.000Z'),
      verifiedAt: fakeTimestamp('2026-10-24T08:00:00.000Z'),
    });
    expect(out.id).toBe('abc');
    expect(out.createdAt).toBe('2026-10-24T07:00:00.000Z');
    expect(out.verifiedAt).toBe('2026-10-24T08:00:00.000Z');
  });
  it('passes string dates through untouched', () => {
    const out = docToModel('x', { createdAt: '2026-01-01T00:00:00.000Z' });
    expect(out.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
