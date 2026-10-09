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

describe('the upsell charger is stock, not sample data', () => {
  it('is not on the list the catalogue import page offers to delete', async () => {
    // It once was, so the import page offered it for deletion with the demo
    // phones, and the "Add a charger" option vanished from every phone page.
    const { default: sampleIds } = await import('../../data/catalogue/legacySampleIds.json');
    expect(sampleIds).not.toContain('lehart-usb-c-fast-charger-brick-with-cable');
  });
});

describe('a charger re-created in the admin', () => {
  const recreated = { ...phone('LeHart'), id: 'lehart-20w-usb-c-charger', model: '20W USB-C Fast Charger', category: 'Accessories' as const, price: 19, stock: 5 };

  it('is offered even though its id differs from the original', () => {
    expect(chargerUpsellFor(phone('Apple'), [recreated])?.product.id).toBe('lehart-20w-usb-c-charger');
  });

  it('is not offered when it is out of stock', () => {
    expect(chargerUpsellFor(phone('Apple'), [{ ...recreated, stock: 0 }])).toBeNull();
  });

  it('never offers a phone as the charger', () => {
    const phoneNamedCharger = { ...phone('Apple'), id: 'x', model: 'USB-C Charger Phone', stock: 3 };
    expect(chargerUpsellFor(phone('Apple'), [phoneNamedCharger])).toBeNull();
  });
});
