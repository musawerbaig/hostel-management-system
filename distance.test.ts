import { describe, it, expect } from 'vitest';
import { distanceKm, COMSATS } from './types';

describe('distanceKm (haversine, never stored)', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(COMSATS.latitude, COMSATS.longitude, COMSATS.latitude, COMSATS.longitude)).toBe(0);
  });
  it('is symmetric', () => {
    const a = distanceKm(33.6516, 73.1566, 33.7, 73.2);
    const b = distanceKm(33.7, 73.2, 33.6516, 73.1566);
    expect(a).toBe(b);
  });
  it('is roughly 1 km for a ~0.009 degree latitude shift', () => {
    const d = distanceKm(COMSATS.latitude, COMSATS.longitude, COMSATS.latitude + 0.009, COMSATS.longitude);
    expect(d).toBeGreaterThan(0.9);
    expect(d).toBeLessThan(1.1);
  });
});
