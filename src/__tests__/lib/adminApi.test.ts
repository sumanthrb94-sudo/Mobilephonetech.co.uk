import { describe, it, expect } from 'vitest';
import {
  slugify, validateDraft, draftToRow, emptyDraft, productToDraft,
  validateImageFile, imagePath, pathFromPublicUrl, describeError,
  MAX_IMAGE_BYTES, IMAGE_BUCKET,
  type ProductDraft,
} from '../../lib/adminApi';
import { MOCK_PHONES } from '../../test/fixtures/mockPhones';

function draft(overrides: Partial<ProductDraft> = {}): ProductDraft {
  return {
    ...emptyDraft(),
    id: 'apple-iphone-17',
    brand: 'Apple',
    model: 'iPhone 17',
    imageUrl: 'https://example.test/iphone-17.jpg',
    price: 759,
    originalPrice: 1099,
    ...overrides,
  };
}

function fakeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('slugify', () => {
  it('joins parts into a URL-safe slug', () => {
    expect(slugify('Apple', 'iPhone 17 Pro Max')).toBe('apple-iphone-17-pro-max');
  });

  it('collapses punctuation and trims stray hyphens', () => {
    expect(slugify('Samsung', 'Galaxy Z Fold5 (5G)')).toBe('samsung-galaxy-z-fold5-5g');
  });

  it('returns an empty string for input with no alphanumerics', () => {
    expect(slugify('---', '!!!')).toBe('');
  });
});

describe('validateDraft', () => {
  it('accepts a well-formed draft', () => {
    expect(validateDraft(draft({ batteryHealth: 85 }))).toEqual({});
  });

  it('lists a product with no photo yet (the shop shows an illustration)', () => {
    expect(validateDraft(draft({ batteryHealth: 85, imageUrl: undefined }))).toEqual({});
  });

  it('accepts a photo uploaded only for one colour', () => {
    const variants = [{ id: 'v1', color: 'Black', storage: '256GB', condition: 'Pristine' as const, price: 700, originalPrice: 799, stock: 1, batteryHealth: 90, galleryImages: ['https://example.test/black.jpg'] }];
    expect(validateDraft(draft({ imageUrl: undefined, variantMode: true, variants }))).toEqual({});
  });

  it('saves an unlisted draft without prices, conditions or photos', () => {
    const variants = [
      { id: 'v1', color: 'Black', storage: '256GB', price: 0, originalPrice: 0, stock: 0 },
      { id: 'v2', color: 'White', storage: '256GB', price: 0, originalPrice: 0, stock: 0 },
    ];
    expect(validateDraft(draft({ listed: false, imageUrl: undefined, price: 0, originalPrice: 0, variantMode: true, variants }))).toEqual({});
  });

  it('will not list a model with no priced configuration', () => {
    const variants = [{ id: 'v1', color: 'Black', storage: '256GB', price: 0, originalPrice: 0, stock: 0, galleryImages: ['https://example.test/black.jpg'] }];
    expect(validateDraft(draft({ listed: true, variantMode: true, variants }))).toHaveProperty('listed');
  });

  it('lists a model with one priced configuration and the rest left unpriced', () => {
    const variants = [
      { id: 'v1', color: 'Black', storage: '256GB', condition: 'Excellent' as const, price: 650, originalPrice: 799, stock: 1, batteryHealth: 92, galleryImages: ['https://example.test/black.jpg'] },
      { id: 'v2', color: 'White', storage: '256GB', price: 0, originalPrice: 0, stock: 0 },
    ];
    expect(validateDraft(draft({ listed: true, variantMode: true, variants }))).toEqual({});
  });

  it('still requires a condition and battery on every priced configuration', () => {
    const variants = [{ id: 'v1', color: 'Black', storage: '256GB', price: 650, originalPrice: 799, stock: 1, galleryImages: ['https://example.test/black.jpg'] }];
    const errors = validateDraft(draft({ listed: true, variantMode: true, variants }));
    expect(errors).toHaveProperty('variant-0-condition');
    expect(errors).toHaveProperty('variant-0-batteryHealth');
  });

  it('refuses stock on a configuration with no price', () => {
    const variants = [
      { id: 'v1', color: 'Black', storage: '256GB', condition: 'Excellent' as const, price: 650, originalPrice: 799, stock: 1, batteryHealth: 92, galleryImages: ['https://example.test/black.jpg'] },
      { id: 'v2', color: 'White', storage: '256GB', price: 0, originalPrice: 0, stock: 2 },
    ];
    expect(validateDraft(draft({ listed: true, variantMode: true, variants }))).toHaveProperty('variant-1-price');
  });

  it.each([
    ['id', { id: '' }],
    ['id', { id: 'Has Spaces' }],
    ['model', { model: '' }],
    ['brand', { brand: '' }],
    ['price', { price: 0 }],
    ['stock', { stock: -1 }],
    ['batteryHealth', { batteryHealth: 101 }],
    ['warrantyMonths', { warrantyMonths: -1 }],
  ])('flags %s', (field, overrides) => {
    expect(validateDraft(draft(overrides))).toHaveProperty(field);
  });

  it('rejects a was-price below the selling price, which would show a negative saving', () => {
    const errors = validateDraft(draft({ price: 900, originalPrice: 500 }));
    expect(errors.originalPrice).toMatch(/below the selling price/i);
  });

  it('requires Apple phones to have verified 85%+ battery health', () => {
    expect(validateDraft(draft({ batteryHealth: undefined }))).toHaveProperty('batteryHealth');
    expect(validateDraft(draft({ batteryHealth: 84 }))).toHaveProperty('batteryHealth');
  });

  it('allows an absent battery health for non-Apple products', () => {
    expect(validateDraft(draft({ brand: 'Samsung', batteryHealth: undefined }))).toEqual({});
    expect(validateDraft(draft({ category: 'Accessories', batteryHealth: undefined }))).toEqual({});
  });

  it('rejects a fractional battery health', () => {
    expect(validateDraft(draft({ batteryHealth: 88.5 }))).toHaveProperty('batteryHealth');
  });
});

describe('draftToRow', () => {
  it('keeps configurations on a product saved without opening its matrix', () => {
    // Regression: outside matrix mode the rows were written back as null, so
    // opening a product and saving any other field erased every configuration.
    const variants = [{ id: 'v1', color: 'Black', storage: '256GB', price: 700, originalPrice: 799, stock: 2 }];
    const row = draftToRow(draft({ variantMode: false, variants }));
    expect(row.variants).toEqual(variants);
  });

  it('records draft status and matrix mode so the editor reopens the same way', () => {
    const variants = [{ id: 'v1', color: 'Black', storage: '256GB', price: 0, originalPrice: 0, stock: 0 }];
    const row = draftToRow(draft({ listed: false, variantMode: true, variants }));
    expect(row.listed).toBe(false);
    expect(row.variantMode).toBe(true);
  });

  it('prices the card from offered configurations, not the unpriced rest of the matrix', () => {
    const variants = [
      { id: 'v1', color: 'Black', storage: '256GB', condition: 'Excellent' as const, price: 650, originalPrice: 799, stock: 1 },
      { id: 'v2', color: 'White', storage: '512GB', price: 0, originalPrice: 0, stock: 0 },
    ];
    const row = draftToRow(draft({ variantMode: true, variants }));
    expect(row.price).toBe(650);
    expect(row.colorOptions).toEqual(['Black']);
    expect(row.storageOptions).toEqual(['256GB']);
    // The unpriced row is still stored, for staff to price later.
    expect(row.variants).toHaveLength(2);
  });

  it('uses the first colour photo as the card image when no shared photo exists', () => {
    const variants = [{ id: 'v1', color: 'Black', storage: '256GB', price: 700, originalPrice: 799, stock: 1, galleryImages: ['https://example.test/black-1.jpg'] }];
    const row = draftToRow(draft({ imageUrl: undefined, variantMode: true, variants }));
    expect(row.imageUrl).toBe('https://example.test/black-1.jpg');
  });

  it('maps the draft onto the Firestore document fields', () => {
    const row = draftToRow(draft({ batteryHealth: 90, storage: '256GB' }));
    expect(row).toMatchObject({
      originalPrice: 1099,
      batteryHealth: 90,
      warrantyMonths: 12,
      returnDays: 30,
      isCertified: true,
      storage: '256GB',
    });
  });

  it('omits id — it is the document key, not a field that could drift from it', () => {
    expect(draftToRow(draft())).not.toHaveProperty('id');
  });

  it('derives searchTerms, since Firestore cannot do a LIKE query', () => {
    const row = draftToRow(draft({ brand: 'Apple', model: 'iPhone 17' }));
    const terms = row.searchTerms as string[];
    expect(terms).toContain('apple');
    expect(terms).toContain('iphone');
    expect(terms).toContain('17');
    // Prefixes so a partially typed query still matches.
    expect(terms).toContain('iph');
  });

  it('sends null rather than empty strings and arrays', () => {
    const row = draftToRow(draft({ storage: '', description: '', galleryImages: [], colorOptions: [] }));
    expect(row.storage).toBeNull();
    expect(row.description).toBeNull();
    expect(row.galleryImages).toBeNull();
    expect(row.colorOptions).toBeNull();
  });

  it('never emits undefined, which Firestore rejects outright', () => {
    const row = draftToRow(draft({ batteryHealth: undefined }));
    expect(Object.values(row).every(v => v !== undefined)).toBe(true);
  });
});

describe('productToDraft', () => {
  it('round-trips a real catalogue product through draftToRow without losing fields', () => {
    const product = MOCK_PHONES[0];
    const row = draftToRow(productToDraft(product));
    expect(row.model).toBe(product.model);
    expect(row.brand).toBe(product.brand);
    expect(row.price).toBe(product.price);
    expect(row.originalPrice).toBe(product.originalPrice);
    expect(row.grade).toBe(product.grade);
    expect(row.stock).toBe(product.stock);
  });
});

describe('validateImageFile', () => {
  it('accepts a small JPEG', () => {
    expect(validateImageFile(fakeFile('a.jpg', 'image/jpeg', 1024))).toBeNull();
  });

  it('rejects a non-image type', () => {
    expect(validateImageFile(fakeFile('a.pdf', 'application/pdf', 1024)))
      .toMatch(/JPEG, PNG, WebP or AVIF/);
  });

  it('rejects a file over the 5 MB limit', () => {
    expect(validateImageFile(fakeFile('big.png', 'image/png', MAX_IMAGE_BYTES + 1)))
      .toMatch(/over the 5 MB limit/);
  });

  it('accepts a file exactly on the limit', () => {
    expect(validateImageFile(fakeFile('edge.png', 'image/png', MAX_IMAGE_BYTES))).toBeNull();
  });
});

describe('imagePath', () => {
  it('files the upload under the product id and keeps the extension', () => {
    expect(imagePath('apple-iphone-17', 'Photo.JPEG', 'abc123')).toBe('apple-iphone-17/abc123.jpeg');
  });

  it('falls back to jpg when the name has no extension', () => {
    // The basename is the unique token, not the original filename — only the
    // extension is carried over. `'noext'.split('.').pop()` is 'noext', so a
    // naive implementation produces 'p/u.noext' here.
    expect(imagePath('p', 'noext', 'u')).toBe('p/u.jpg');
  });

  it('ignores a leading dot, which is a hidden file rather than an extension', () => {
    expect(imagePath('p', '.gitkeep', 'u')).toBe('p/u.jpg');
  });
});

describe('pathFromPublicUrl', () => {
  // Firebase download URLs percent-encode the whole object path inside /o/ and
  // append ?alt=media&token=..., so both have to be undone to get back to the
  // path that deleteObject expects.
  const download = (path: string) =>
    `https://firebasestorage.googleapis.com/v0/b/proj.appspot.com/o/${encodeURIComponent(path)}?alt=media&token=abc-123`;

  it('extracts the storage path from a download URL', () => {
    expect(pathFromPublicUrl(download(`${IMAGE_BUCKET}/apple-iphone-17/abc.jpg`)))
      .toBe('apple-iphone-17/abc.jpg');
  });

  it('decodes percent-encoded segments', () => {
    expect(pathFromPublicUrl(download(`${IMAGE_BUCKET}/p/a b.jpg`))).toBe('p/a b.jpg');
  });

  it('strips the query string, which carries the access token', () => {
    const url = download(`${IMAGE_BUCKET}/p/x.jpg`);
    expect(url).toContain('token=');
    expect(pathFromPublicUrl(url)).toBe('p/x.jpg');
  });

  it('returns null for a bundled asset so it is never sent to deleteObject', () => {
    expect(pathFromPublicUrl('/assets/iphone-17-pro-max-orange.jpg')).toBeNull();
    expect(pathFromPublicUrl('https://example.com/other-bucket/x.jpg')).toBeNull();
  });

  it('returns null for a file outside the product-images folder', () => {
    expect(pathFromPublicUrl(download('some-other-folder/x.jpg'))).toBeNull();
  });
});

describe('describeError', () => {
  it('explains a rules rejection in terms the admin can act on', () => {
    // "Missing or insufficient permissions" gives no clue what to do about it.
    expect(describeError({ code: 'permission-denied', message: 'Missing or insufficient permissions.' }))
      .toMatch(/not an admin/i);
    expect(describeError({ code: 'storage/unauthorized', message: 'User does not have permission' }))
      .toMatch(/not an admin/i);
    expect(describeError({ message: 'Missing or insufficient permissions.' }))
      .toMatch(/not an admin/i);
  });

  it('explains a duplicate slug', () => {
    expect(describeError({ code: 'already-exists', message: 'exists' })).toMatch(/slug already exists/i);
  });

  it('explains an expired session separately from a permissions problem', () => {
    expect(describeError({ code: 'unauthenticated', message: 'x' })).toMatch(/session expired/i);
  });

  it('explains an unreachable backend', () => {
    expect(describeError({ code: 'unavailable', message: 'x' })).toMatch(/could not reach/i);
  });

  it('falls back to the raw message', () => {
    expect(describeError({ message: 'network unreachable' })).toBe('network unreachable');
  });
});
