import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDoc, getDocs, setDoc } from 'firebase/firestore';
import { loadSavedAddress, saveProfileAddress } from '../../lib/profileAddress';

/**
 * Where checkout and My Account both get the saved address from. The bug
 * this guards: checkout never wrote the profile, so the account page —
 * reading only the profile — showed "Not set" to customers with orders.
 */

const profile = (data: Record<string, unknown> | undefined) =>
  vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => !!data, data: () => data, id: 'u1' } as never);
const orders = (rows: Record<string, unknown>[]) =>
  vi.mocked(getDocs).mockResolvedValueOnce({ empty: !rows.length, size: rows.length, docs: rows.map(r => ({ data: () => r })) } as never);

beforeEach(() => { vi.mocked(setDoc).mockClear(); });

describe('loadSavedAddress', () => {
  it('prefers the profile address', async () => {
    profile({ phone: '07700 900123', address: { line1: '1 Test Terrace', line2: '', city: 'London', postcode: 'NW1 6XE', country: 'United Kingdom' } });
    const saved = await loadSavedAddress('u1');
    expect(saved).toMatchObject({ source: 'profile', phone: '07700 900123', address: { addressLine1: '1 Test Terrace', postalCode: 'NW1 6XE' } });
  });

  it('falls back to the newest order for a customer who checked out before profiles were saved', async () => {
    profile({ address: { line1: '', line2: '', city: '', postcode: '', country: 'United Kingdom' }, contactPhone: '07700 900999' });
    orders([
      { createdAt: '2026-01-01T00:00:00Z', shippingAddress: { addressLine1: 'Old Road', city: 'Leeds', postalCode: 'LS1 1AA' } },
      { createdAt: '2026-06-01T00:00:00Z', shippingAddress: { addressLine1: 'New Road', city: 'York', postalCode: 'YO1 7HH' } },
    ]);
    const saved = await loadSavedAddress('u1');
    expect(saved).toMatchObject({ source: 'order', phone: '07700 900999', address: { addressLine1: 'New Road', city: 'York' } });
  });

  it('is null for someone with neither', async () => {
    profile(undefined);
    orders([]);
    expect(await loadSavedAddress('u1')).toBeNull();
  });
});

describe('saveProfileAddress', () => {
  it('writes the profile shape the rules accept, merged so name and role are untouched', async () => {
    await saveProfileAddress('u1', {
      addressLine1: '1 Test Terrace', addressLine2: '', city: 'London', postalCode: 'nw1 6xe', country: 'United Kingdom',
      location: { lat: 51.5237, lng: -0.1585, pinned: true },
    });
    const [ref, data, opts] = vi.mocked(setDoc).mock.calls[0] as unknown as [{ path: string }, Record<string, unknown>, unknown];
    expect(ref.path).toBe('users/u1');
    expect(opts).toEqual({ merge: true });
    expect(data.address).toEqual({
      line1: '1 Test Terrace', line2: '', city: 'London', postcode: 'NW1 6XE', country: 'United Kingdom',
      location: { lat: 51.5237, lng: -0.1585, pinned: true },
    });
    expect(Object.keys(data).sort()).toEqual(['address', 'updatedAt']);
  });
});
