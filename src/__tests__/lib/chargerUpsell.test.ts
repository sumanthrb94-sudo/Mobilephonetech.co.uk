import { describe, expect, it } from 'vitest';
import { chargerUpsellFor } from '../../lib/chargerUpsell';
import type { Product } from '../../types';

const phone = (brand: string): Product => ({
  id: `${brand}-phone`, model: 'Test phone', brand, category: 'Phones', price: 100,
  originalPrice: 120, grade: 'Good', batteryHealth: 90, warrantyMonths: 12,
  returnDays: 30, imageUrl: '/phone.png', isCertified: true, stock: 1, specs: {},
});

const charger = (id: string): Product => ({
  ...phone('VIDVIE'), id, model: 'Compatible charger', category: 'Accessories', price: 35,
});

describe('chargerUpsellFor', () => {
  it('offers an optional wall charger for iPhones', () => {
    const result = chargerUpsellFor(phone('Apple'), [
      charger('lehart-usb-c-fast-charger-brick-with-cable'),
    ]);
    expect(result?.title).toMatch(/wall charger/i);
    expect(result?.description).toMatch(/does not include/i);
  });

  it('offers the USB-C charger for Android phones', () => {
    const result = chargerUpsellFor(phone('Samsung'), [
      charger('lehart-usb-c-fast-charger-brick-with-cable'),
    ]);
    expect(result?.title).toMatch(/USB-C/i);
  });

  it('does not offer a charger for non-phone products or missing stock', () => {
    expect(chargerUpsellFor({ ...phone('Apple'), category: 'Accessories' }, [])).toBeNull();
    expect(chargerUpsellFor(phone('Apple'), [{
      ...charger('lehart-usb-c-fast-charger-brick-with-cable'), stock: 0,
    }])).toBeNull();
  });
});
