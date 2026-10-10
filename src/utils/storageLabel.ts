import type { Product } from '../types';

/** "64GB" -> 64, "1TB" -> 1024; unknown text sorts last. */
function gigabytes(s: string): number {
  const m = s.replace(/\s+/g, '').match(/^(\d+(?:\.\d+)?)(GB|TB)$/i);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return parseFloat(m[1]) * (m[2].toUpperCase() === 'TB' ? 1024 : 1);
}

const tidy = (s: string) => s.replace(/\s+/g, '').toUpperCase().replace(/(GB|TB)$/, u => u);

/**
 * The storage a product card shows. Products made in the admin matrix keep
 * storage per configuration, not on the product, so cards for them showed
 * nothing while older products showed "128GB". Now every card says it:
 * the one size, or the range across configurations in stock.
 */
export function storageLabel(p: Pick<Product, 'storage' | 'variants'>): string {
  const variants = p.variants ?? [];
  const inStock = variants.filter(v => (v.stock ?? 0) > 0);
  const pool = (inStock.length ? inStock : variants).map(v => (v.storage ?? '').trim()).filter(Boolean);
  const sizes = [...new Set(pool.map(tidy))].sort((a, b) => gigabytes(a) - gigabytes(b));
  if (sizes.length === 0) return (p.storage ?? '').trim();
  if (sizes.length === 1) return sizes[0];
  return `${sizes[0]} – ${sizes[sizes.length - 1]}`;
}
