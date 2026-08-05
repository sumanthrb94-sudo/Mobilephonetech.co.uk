import { describe, it, expect } from 'vitest';
import {
  slugify, validateDraft, draftToRow, emptyDraft, productToDraft,
  validateImageFile, imagePath, pathFromPublicUrl, describeError,
  MAX_IMAGE_BYTES, IMAGE_BUCKET,
  type ProductDraft,
} from '../../lib/adminApi';
import { MOCK_PHONES } from '../../data';

function draft(overrides: Partial<ProductDraft> = {}): ProductDraft {
  return {
    ...emptyDraft(),
    id: 'apple-iphone-17',
    brand: 'Apple',
    model: 'iPhone 17',
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
    expect(validateDraft(draft())).toEqual({});
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

  it('allows an absent battery health for non-battery items', () => {
    expect(validateDraft(draft({ batteryHealth: undefined }))).toEqual({});
  });

  it('rejects a fractional battery health', () => {
    expect(validateDraft(draft({ batteryHealth: 88.5 }))).toHaveProperty('batteryHealth');
  });
});

describe('draftToRow', () => {
  it('maps camelCase fields onto the snake_case columns', () => {
    const row = draftToRow(draft({ batteryHealth: 90, storage: '256GB' }));
    expect(row).toMatchObject({
      id: 'apple-iphone-17',
      original_price: 1099,
      battery_health: 90,
      warranty_months: 12,
      return_days: 30,
      is_certified: true,
      storage: '256GB',
    });
  });

  it('sends null rather than empty strings and arrays so the column stays NULL', () => {
    const row = draftToRow(draft({ storage: '', description: '', galleryImages: [], colorOptions: [] }));
    expect(row.storage).toBeNull();
    expect(row.description).toBeNull();
    expect(row.gallery_images).toBeNull();
    expect(row.color_options).toBeNull();
  });
});

describe('productToDraft', () => {
  it('round-trips a real catalogue product through draftToRow without losing fields', () => {
    const product = MOCK_PHONES[0];
    const row = draftToRow(productToDraft(product));
    expect(row.id).toBe(product.id);
    expect(row.model).toBe(product.model);
    expect(row.brand).toBe(product.brand);
    expect(row.price).toBe(product.price);
    expect(row.original_price).toBe(product.originalPrice);
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
  it('extracts the storage path from a public URL', () => {
    const url = `https://x.supabase.co/storage/v1/object/public/${IMAGE_BUCKET}/apple-iphone-17/abc.jpg`;
    expect(pathFromPublicUrl(url)).toBe('apple-iphone-17/abc.jpg');
  });

  it('decodes percent-encoded segments', () => {
    const url = `https://x.supabase.co/storage/v1/object/public/${IMAGE_BUCKET}/p/a%20b.jpg`;
    expect(pathFromPublicUrl(url)).toBe('p/a b.jpg');
  });

  it('returns null for a bundled asset so it is never sent to storage.remove', () => {
    expect(pathFromPublicUrl('/assets/iphone-17-pro-max-orange.jpg')).toBeNull();
    expect(pathFromPublicUrl('https://example.com/other-bucket/x.jpg')).toBeNull();
  });
});

describe('describeError', () => {
  it('explains an RLS rejection in terms the admin can act on', () => {
    expect(describeError({ code: '42501', message: 'new row violates row-level security policy' }))
      .toMatch(/not an admin/i);
    expect(describeError({ message: 'row-level security policy violation' }))
      .toMatch(/not an admin/i);
  });

  it('explains a duplicate slug', () => {
    expect(describeError({ code: '23505', message: 'duplicate key' })).toMatch(/slug already exists/i);
  });

  it('falls back to the raw message', () => {
    expect(describeError({ message: 'network unreachable' })).toBe('network unreachable');
  });
});
