import { describe, it, expect } from 'vitest';
// The importer's logic lives in a plain .mjs module so the Node script and
// these tests run exactly the same code. No types ship with it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cat: any = await import('../../../scripts/lib/catalogue.mjs');

/**
 * The inventory export is typed by people, so the same device arrives spelled
 * several ways. Every case below is a real pair from the 29 August export that
 * would otherwise have become two listings splitting one pool of stock.
 */
describe('one device, one listing', () => {
  it('folds the brand prefix people sometimes type and sometimes do not', () => {
    expect(cat.canonicalModel('SAMSUNG GALAXY A32 5G')).toBe(cat.canonicalModel('Galaxy A32 5G'));
    expect(cat.canonicalModel('APPLE IPHONE 8')).toBe(cat.canonicalModel('iPhone 8'));
  });

  it('folds spacing and case variants', () => {
    expect(cat.canonicalModel('GALAXY S20FE')).toBe(cat.canonicalModel('GALAXY S20 FE'));
    expect(cat.canonicalModel('SAMSUNG GALAXY S23FE')).toBe(cat.canonicalModel('GALAXY S23 Fe'));
    expect(cat.canonicalModel('APPLE IPHONE 13PRO')).toBe(cat.canonicalModel('IPHONE 13 Pro'));
    expect(cat.canonicalModel('SAMSUNG X COVER 5 4G')).toBe(cat.canonicalModel('Galaxy XCover 5 4G'));
    expect(cat.canonicalModel('SAMSUNG GALAXY TAB A T580')).toBe(cat.canonicalModel('GALAXY TAB T580'));
  });

  it('keeps genuinely different devices apart', () => {
    // Merging these would sell someone the wrong phone.
    expect(cat.canonicalModel('Galaxy A32')).not.toBe(cat.canonicalModel('Galaxy A32 5G'));
    expect(cat.canonicalModel('Galaxy Tab A11')).not.toBe(cat.canonicalModel('Galaxy Tab A11 Plus'));
    expect(cat.canonicalModel('iPhone 12')).not.toBe(cat.canonicalModel('iPhone 12 Mini'));
  });

  it('reads the brand and category from the model text', () => {
    expect(cat.brandOf('APPLE IWATCH SE3 CELLULAR')).toBe('Apple');
    expect(cat.brandOf('S25 FE')).toBe('Samsung');
    expect(cat.brandOf('Pixel 9A')).toBe('Google');
    expect(cat.categoryOf('IPAD 9TH GEN CELLULAR')).toBe('Ipads & Tabs');
    expect(cat.categoryOf('APPLE IWATCH SE3 CELLULAR')).toBe('Smartwatches');
    expect(cat.categoryOf('Galaxy A32')).toBe('Phones');
  });
});

describe('grades a customer can act on', () => {
  it('maps supplier shorthand to the published grading language', () => {
    expect(cat.gradeOf('A')).toBe('Excellent');
    expect(cat.gradeOf('C')).toBe('Fair');
    expect(cat.gradeOf('B-')).toBe('Good');
  });

  it('does not call an opened unit new', () => {
    // ONU is open-never-used. "New" would be a claim about a sealed device.
    expect(cat.gradeOf('ONU')).toBe('Pristine');
    expect(cat.gradeOf('ONU')).not.toBe('New');
  });

  it('falls back rather than throwing on an unknown grade', () => {
    expect(cat.gradeOf('')).toBe('Good');
    expect(cat.gradeOf('Z')).toBe('Good');
  });
});

describe('columns that carry two kinds of value', () => {
  it('does not sell a watch case size as storage', () => {
    expect(cat.storageOf('40MM')).toBeNull();
    expect(cat.caseSizeOf('40MM')).toBe('40MM');
    expect(cat.storageOf('128GB')).toBe('128GB');
    expect(cat.caseSizeOf('128GB')).toBeNull();
  });

  it('folds six spellings of the SIM column into three answers', () => {
    expect(cat.simTypeOf('Physical SIM + eSIM')).toBe('Physical SIM + eSIM');
    expect(cat.simTypeOf('SIM + eSIM')).toBe('Physical SIM + eSIM');
    expect(cat.simTypeOf('SINGLE PHYSICAL SIM')).toBe('Single physical SIM');
    expect(cat.simTypeOf('Dual Physical SIM')).toBe('Dual physical SIM');
    expect(cat.simTypeOf('Not Applicable')).toBeNull();
  });

  it('folds colour case and spelling', () => {
    expect(cat.colourOf('BLACK')).toBe(cat.colourOf('Black'));
    expect(cat.colourOf('SPACE GRAY')).toBe('Space Grey');
  });
});

describe('what may be listed', () => {
  const base = { imei: '123', stockType: 'OFFICE', returnDate: '' };

  it('will not list stock that is not in the building', () => {
    // SHS rows are awaiting delivery and carry no IMEI. Selling one is a
    // cancelled order and a bad first review.
    expect(cat.isSellable({ ...base, stockType: 'SHS', imei: '' })).toBe(false);
    expect(cat.isSellable({ ...base, imei: '' })).toBe(false);
  });

  it('will not list a returned unit before it has been inspected', () => {
    expect(cat.isSellable({ ...base, returnDate: '2026-08-28' })).toBe(false);
  });

  it('lists a held, unreturned unit', () => {
    expect(cat.isSellable(base)).toBe(true);
  });
});

describe('price', () => {
  it('derives retail from the buy price when the export has no sell column', () => {
    const p = cat.priceFor(110, 'Excellent');
    expect(p!.price).toBeGreaterThan(110);
    expect(p!.originalPrice).toBeGreaterThan(p!.price);
  });

  it('charges more for a better grade of the same handset', () => {
    expect(cat.priceFor(100, 'Pristine')!.price).toBeGreaterThan(cat.priceFor(100, 'Fair')!.price);
  });

  it('refuses to invent a price with no cost to work from', () => {
    expect(cat.priceFor(0, 'Good')).toBeNull();
    expect(cat.priceFor('', 'Good')).toBeNull();
  });
});

describe('building the catalogue', () => {
  const rows = [
    { Model: 'SAMSUNG GALAXY A32 5G', IMEI: '1', Grade: 'A', Storage: '64GB', Colour: 'BLACK', BP: 60, 'Stock Type': 'OFFICE', 'SIM Type': 'Dual Physical SIM' },
    { Model: 'Galaxy A32 5G', IMEI: '2', Grade: 'A', Storage: '64GB', Colour: 'Black', BP: 62, 'Stock Type': 'OFFICE', 'SIM Type': 'Dual Physical SIM' },
    { Model: 'Galaxy A32 5G', IMEI: '3', Grade: 'C', Storage: '64GB', Colour: 'Blue', BP: 45, 'Stock Type': 'OFFICE', 'SIM Type': 'Dual Physical SIM' },
    { Model: 'Galaxy A32 5G', IMEI: '', Grade: 'A', Storage: '64GB', Colour: 'Black', BP: 60, 'Stock Type': 'SHS', 'SIM Type': 'Dual Physical SIM' },
  ];

  it('collapses spellings into one listing and counts the units behind it', () => {
    const { products } = cat.buildCatalogue(rows);
    expect(products).toHaveLength(1);
    // Three held units; the SHS row is not in the building.
    expect(products[0].stock).toBe(3);
  });

  it('gives each condition its own price and its own stock', () => {
    const { products } = cat.buildCatalogue(rows);
    const excellent = products[0].variants.find((v: any) => v.condition === 'Excellent')!;
    const fair = products[0].variants.find((v: any) => v.condition === 'Fair')!;

    expect(excellent.stock).toBe(2);
    expect(fair.stock).toBe(1);
    // Choosing Fair must charge the Fair price, not the listing's headline.
    expect(fair.price).toBeLessThan(excellent.price);
  });

  it('leads with the cheapest variant, which is the one that can be honoured', () => {
    const { products } = cat.buildCatalogue(rows);
    expect(products[0].price).toBe(Math.min(...products[0].variants.map((v: any) => v.price)));
  });

  it('prefers an explicit sell price over the derived one', () => {
    const { products } = cat.buildCatalogue([{ ...rows[0], SP: 199 }]);
    expect(products[0].price).toBe(199);
  });
});
