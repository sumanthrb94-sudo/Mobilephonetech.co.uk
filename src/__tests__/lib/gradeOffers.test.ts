import { describe, it, expect } from 'vitest';
import {
  gradeLadder, gradeOffer, otherRadio, closestUnit, preferredUnits,
} from '../../lib/gradeOffers';
import type { ProductVariant } from '../../types';

/**
 * gradeOffer is the one answer to "which unit does this grade sell?" for
 * both the grade list beside the price and the grade comparison lower down
 * the product page, so the two always pick the same unit.
 */

const unit = (over: Partial<ProductVariant> & { id: string }): ProductVariant => ({
  color: 'Silver', storage: '128GB', condition: 'Pristine',
  price: 400, originalPrice: 600, stock: 1,
  ...over,
});

describe('gradeLadder', () => {
  it('is Pristine, Excellent and Good for a model with neither New nor Fair', () => {
    expect(gradeLadder([unit({ id: 'a' })])).toEqual(['Pristine', 'Excellent', 'Good']);
    expect(gradeLadder([])).toEqual(['Pristine', 'Excellent', 'Good']);
  });

  it('leads with New and ends with Fair when the model has them, in stock or not', () => {
    expect(gradeLadder([
      unit({ id: 'f', condition: 'Fair', stock: 0 }),
      unit({ id: 'n', condition: 'New' }),
    ])).toEqual(['New', 'Pristine', 'Excellent', 'Good', 'Fair']);
  });
});

describe('preferredUnits', () => {
  const wifiOos = unit({ id: 'wifi-oos', connectivity: 'Wi-Fi', stock: 0 });
  const cell = unit({ id: 'cell', connectivity: 'Cellular' });
  const wifi = unit({ id: 'wifi', connectivity: 'Wi-Fi' });

  it('prefers in stock on the same radio, then in stock on any, then sold out', () => {
    expect(preferredUnits([wifiOos, cell, wifi], 'Wi-Fi')).toEqual([wifi]);
    expect(preferredUnits([wifiOos, cell], 'Wi-Fi')).toEqual([cell]);
    expect(preferredUnits([wifiOos], 'Wi-Fi')).toEqual([wifiOos]);
    expect(preferredUnits([], 'Wi-Fi')).toEqual([]);
  });
});

describe('gradeOffer', () => {
  const active = unit({ id: 'active', condition: 'Pristine', connectivity: 'Wi-Fi', price: 400 });

  it('lets the active unit speak for its own grade', () => {
    const cheaperTwin = unit({ id: 'twin', condition: 'Pristine', connectivity: 'Wi-Fi', price: 350 });
    expect(gradeOffer([active, cheaperTwin], active, 'Pristine')).toBe(active);
  });

  it('offers nothing for the active grade when the active unit is sold out', () => {
    const soldOut = { ...active, stock: 0 };
    const otherRadioInStock = unit({ id: 'cell', condition: 'Pristine', connectivity: 'Cellular', price: 520 });
    expect(gradeOffer([soldOut, otherRadioInStock], soldOut, 'Pristine')).toBeUndefined();
  });

  it('offers the cheapest in-stock unit of that grade in the same colour and capacity', () => {
    const variants = [
      active,
      unit({ id: 'g-dear', condition: 'Good', connectivity: 'Wi-Fi', price: 320 }),
      unit({ id: 'g-cheap', condition: 'Good', connectivity: 'Wi-Fi', price: 300 }),
      unit({ id: 'g-oos', condition: 'Good', connectivity: 'Wi-Fi', price: 200, stock: 0 }),
      unit({ id: 'g-blue', condition: 'Good', connectivity: 'Wi-Fi', price: 100, color: 'Blue' }),
      unit({ id: 'g-256', condition: 'Good', connectivity: 'Wi-Fi', price: 100, storage: '256GB' }),
    ];
    expect(gradeOffer(variants, active, 'Good')?.id).toBe('g-cheap');
  });

  it('keeps the active radio when it can, even over a cheaper unit on the other', () => {
    const variants = [
      active,
      unit({ id: 'g-cell', condition: 'Good', connectivity: 'Cellular', price: 280 }),
      unit({ id: 'g-wifi', condition: 'Good', connectivity: 'Wi-Fi', price: 300 }),
    ];
    expect(gradeOffer(variants, active, 'Good')?.id).toBe('g-wifi');
  });

  it('falls back to the other radio, which otherRadio then names', () => {
    const cell = unit({ id: 'e-cell', condition: 'Excellent', connectivity: 'Cellular', price: 380 });
    const variants = [active, unit({ id: 'e-wifi-oos', condition: 'Excellent', connectivity: 'Wi-Fi', stock: 0 }), cell];
    const offer = gradeOffer(variants, active, 'Excellent');

    expect(offer).toBe(cell);
    expect(otherRadio(offer, active)).toBe('Cellular');
    expect(otherRadio(active, active)).toBeUndefined();
    expect(otherRadio(undefined, active)).toBeUndefined();
  });

  it('offers nothing without an active unit or with nothing on the shelf', () => {
    expect(gradeOffer([active], null, 'Pristine')).toBeUndefined();
    expect(gradeOffer([active], active, 'Excellent')).toBeUndefined();
  });

  it('ignores stray whitespace in colour, storage, grade and radio', () => {
    const spaced = unit({ id: 'spaced', color: ' Silver ', storage: '128GB ', condition: ' Good' as ProductVariant['condition'], connectivity: 'Wi-Fi ' });
    expect(gradeOffer([active, spaced], active, 'Good')).toBe(spaced);
    expect(otherRadio(spaced, active)).toBeUndefined();
  });
});

describe('closestUnit', () => {
  const oosWifi = unit({ id: 'oos-wifi', connectivity: 'Wi-Fi', stock: 0, price: 390 });
  const cell = unit({ id: 'cell', connectivity: 'Cellular', price: 520 });
  const wifiDear = unit({ id: 'wifi-dear', connectivity: 'Wi-Fi', price: 430 });
  const wifi = unit({ id: 'wifi', connectivity: 'Wi-Fi', price: 410 });

  it('takes the cheapest in-stock exact match on the same radio', () => {
    expect(closestUnit('Wi-Fi', [oosWifi, cell, wifiDear, wifi])?.id).toBe('wifi');
  });

  it('then any in-stock exact match, then the sold-out one', () => {
    expect(closestUnit('Wi-Fi', [oosWifi, cell])?.id).toBe('cell');
    expect(closestUnit('Wi-Fi', [oosWifi])?.id).toBe('oos-wifi');
  });

  it('falls back to the wider sets in turn when the grade is not there at all', () => {
    const good = unit({ id: 'good', condition: 'Good' });
    const elsewhere = unit({ id: 'elsewhere', storage: '256GB' });
    expect(closestUnit('Wi-Fi', [], [good], [elsewhere])?.id).toBe('good');
    expect(closestUnit('Wi-Fi', [], [], [elsewhere])?.id).toBe('elsewhere');
    expect(closestUnit('Wi-Fi', [], [])).toBeUndefined();
  });
});
