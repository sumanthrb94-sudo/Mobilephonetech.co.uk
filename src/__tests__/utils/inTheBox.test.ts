import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { generateProductDescription } from '../../utils/productDescription';
import { MOCK_PHONES } from '../../test/fixtures/mockPhones';
import type { Product } from '../../types';

const base = MOCK_PHONES[0];
const make = (o: Partial<Product>): Product => ({ ...base, specs: {} as Product['specs'], ...o } as Product);

describe('generated descriptions name the right kind of device', () => {
  it('an iPad is a tablet, not a smartphone', () => {
    const text = generateProductDescription(make({ brand: 'Apple', model: 'iPad Air 11-inch (M3)', category: 'Tablets' }));
    expect(text).toMatch(/refurbished tablet/);
    expect(text).not.toMatch(/smartphone/);
  });

  it('a Galaxy Tab is a tablet', () => {
    expect(generateProductDescription(make({ brand: 'Samsung', model: 'Galaxy Tab A11 5G', category: 'Ipads & Tabs' }))).toMatch(/refurbished tablet/);
  });

  it('an Apple Watch is a smartwatch', () => {
    expect(generateProductDescription(make({ brand: 'Apple', model: 'Apple Watch Series 9 41mm Aluminium', category: 'Smartwatches' }))).toMatch(/refurbished smartwatch/);
  });

  it('an iPhone is still a smartphone', () => {
    expect(generateProductDescription(make({ brand: 'Apple', model: 'iPhone 15', category: 'Phones' }))).toMatch(/refurbished smartphone/);
  });
});

describe('in the box', () => {
  // Only a cable ships with a device; the wall charger is the paid add-on on
  // the product page. No shopper-facing text may say a charger is included.
  it('nothing claims a charger is included', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) { if (name !== '__tests__' && name !== 'test') walk(path); }
        else if (/\.(tsx?|md)$/.test(name)) files.push(path);
      }
    };
    walk(join(__dirname, '../..'));
    const claim = /charger (&|and) cable included|charger included|includes? a (wall )?charger|charger in the box/i;
    const offenders = files.filter(f => claim.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
