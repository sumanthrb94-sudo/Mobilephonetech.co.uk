import { describe, it, expect } from 'vitest';
import {
  EMPTY_ADDRESS, formatAddressLines, fromStoredAddress, isAddressEmpty, pinMapUrl,
  sameAddress, sanitiseLocation, toProfileAddress, type AddressDraft,
} from '../../utils/address';
import { priceAndValidate } from '../../../api/_orderCore.js';
import { newOrderAlertEmail } from '../../../api/_templates.js';

/**
 * Checkout wrote `{ addressLine1, postalCode }` and My Account read
 * `{ line1, postcode }`, and nothing translated between them — which is why
 * every customer's Addresses tab said "Not set". These pin the translation.
 */

const CHECKOUT: AddressDraft = {
  addressLine1: ' 1 Test Terrace ', addressLine2: 'Flat 2', city: 'London',
  postalCode: 'nw16xe', country: 'United Kingdom',
  location: { lat: 51.52371234567, lng: -0.15851234567, pinned: true },
};

describe('profile address mapping', () => {
  it('maps checkout field names to the profile shape, tidied', () => {
    expect(toProfileAddress(CHECKOUT)).toEqual({
      line1: '1 Test Terrace', line2: 'Flat 2', city: 'London', postcode: 'NW1 6XE',
      country: 'United Kingdom', location: { lat: 51.523712, lng: -0.158512, pinned: true },
    });
  });

  it('round-trips profile → checkout → profile', () => {
    const profile = toProfileAddress(CHECKOUT);
    expect(toProfileAddress(fromStoredAddress(profile)!)).toEqual(profile);
  });

  it('reads an order\'s shippingAddress as well as a profile address', () => {
    const fromOrder = fromStoredAddress({
      fullName: 'Ram', addressLine1: '1 High St', addressLine2: null, city: 'London', postalCode: 'SE1 3TX', country: 'United Kingdom',
    });
    expect(fromOrder).toMatchObject({ addressLine1: '1 High St', addressLine2: '', postalCode: 'SE1 3TX', location: null });
  });

  it('treats the old empty profile as no address at all', () => {
    expect(fromStoredAddress({ line1: '', line2: '', city: '', postcode: '', country: 'United Kingdom' })).toBeNull();
    expect(fromStoredAddress(undefined)).toBeNull();
    expect(fromStoredAddress('221B Baker Street')).toBeNull();
    expect(isAddressEmpty(EMPTY_ADDRESS)).toBe(true);
  });

  it('defaults the country and caps oversized fields to what the rules allow', () => {
    const p = toProfileAddress({ addressLine1: 'x'.repeat(500), country: '' });
    expect(p.line1).toHaveLength(200);
    expect(p.country).toBe('United Kingdom');
  });
});

describe('sanitiseLocation', () => {
  it('drops anything that is not a real coordinate rather than clamping it', () => {
    expect(sanitiseLocation({ lat: 999, lng: 0 })).toBeNull();
    expect(sanitiseLocation({ lat: '51.5', lng: '-0.1' })).toBeNull();
    expect(sanitiseLocation({ lat: NaN, lng: 0 })).toBeNull();
    expect(sanitiseLocation(null)).toBeNull();
  });

  it('keeps pinned strictly boolean', () => {
    expect(sanitiseLocation({ lat: 51.5, lng: -0.1, pinned: 'yes' })).toEqual({ lat: 51.5, lng: -0.1, pinned: false });
  });
});

describe('sameAddress', () => {
  it('ignores case and spacing so a repeat order does not rewrite the profile', () => {
    expect(sameAddress(CHECKOUT, { ...CHECKOUT, addressLine1: '1 test terrace', postalCode: 'NW1 6XE' })).toBe(true);
  });
  it('notices a moved pin', () => {
    expect(sameAddress(CHECKOUT, { ...CHECKOUT, location: { lat: 51.6, lng: -0.15, pinned: true } })).toBe(false);
  });
  it('treats nothing saved yet as different', () => {
    expect(sameAddress(null, CHECKOUT)).toBe(false);
  });
});

describe('formatAddressLines', () => {
  it('writes an envelope: street, flat, then town and postcode together', () => {
    expect(formatAddressLines(CHECKOUT)).toEqual(['1 Test Terrace', 'Flat 2', 'London NW1 6XE']);
  });
  it('names the country only when it is not the UK', () => {
    expect(formatAddressLines({ ...CHECKOUT, addressLine2: '', country: 'Ireland' })).toEqual(['1 Test Terrace', 'London NW1 6XE', 'Ireland']);
  });
});

describe('pinMapUrl', () => {
  it('links to the pin on openstreetmap.org', () => {
    expect(pinMapUrl({ lat: 51.5, lng: -0.1 })).toBe('https://www.openstreetmap.org/?mlat=51.500000&mlon=-0.100000#map=19/51.500000/-0.100000');
  });
});

describe('the pin reaches the order and the staff alert', () => {
  const db = {
    collection: () => ({
      doc: () => ({ get: async () => ({ exists: true, data: () => ({ brand: 'Apple', model: 'iPhone 13', price: 100, stock: 5 }) }) }),
    }),
  };
  const basket = (location: unknown) => ({
    items: [{ productId: 'apple-iphone-13', quantity: 1 }],
    shippingOptionId: 'next_day',
    shippingAddress: {
      fullName: 'Ram Test', addressLine1: '1 High St', city: 'London',
      postalCode: 'SE1 3TX', phone: '07700900123', email: 'ram@example.com', location,
    },
  });

  it('stores a valid pin on the order', async () => {
    const priced = await priceAndValidate(db, basket({ lat: 51.5, lng: -0.09, pinned: true }), null);
    expect(priced.ok && priced.order.shippingAddress.location).toEqual({ lat: 51.5, lng: -0.09, pinned: true });
  });

  it('drops a malformed pin instead of storing it', async () => {
    const priced = await priceAndValidate(db, basket({ lat: 'javascript:alert(1)', lng: 0 }), null);
    expect(priced.ok).toBe(true);
    expect(priced.ok && 'location' in priced.order.shippingAddress).toBe(false);
  });

  it('gives staff a link to a pin the customer placed, and none for an untouched one', () => {
    const order = (pinned: boolean) => ({
      id: 'ORD-1', contactEmail: 'a@example.com', items: [], total: 1,
      shippingAddress: { fullName: 'A', addressLine1: '1 High St', city: 'London', postalCode: 'SE1 3TX', location: { lat: 51.5, lng: -0.09, pinned } },
    });
    expect(newOrderAlertEmail(order(true)).text).toContain('openstreetmap.org/?mlat=51.500000');
    expect(newOrderAlertEmail(order(false)).text).not.toContain('openstreetmap');
  });
});
