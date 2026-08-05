import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, getDoc, getDocs, limit as fsLimit, orderBy, query, where,
} from 'firebase/firestore';
import { Product, FilterState } from '../types';
import { MOCK_PHONES } from '../data';
import { db, COL } from '../lib/firebase';
import { docToProduct } from '../lib/productMapper';

/**
 * Legacy name kept so the ~15 existing call sites and their tests keep working.
 * It converts a Firestore document into the app's Product shape.
 */
export const rowToProduct = (row: Record<string, unknown>): Product =>
  docToProduct((row.id as string) ?? '', row);

// ── useProducts — filtered list ───────────────────────────────
export interface UseProductsOptions {
  filters?: Partial<FilterState>;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'relevance';
  page?: number;
  pageSize?: number;
}

/**
 * Firestore is far more restrictive than SQL: it allows at most one range
 * filter per query, has no OR across different fields, and no offset
 * pagination. Rather than fight that with a composite index per filter
 * combination, the catalogue is small enough (a few hundred products) to fetch
 * once and narrow in memory — which also keeps the filter semantics identical
 * to the previous Postgres implementation and to the MOCK_PHONES fallback.
 */
const FETCH_CAP = 500;

function applyFilters(
  source: Product[],
  filters: Partial<FilterState> | undefined,
  search: string | undefined,
  sort: string,
): Product[] {
  let result = [...source];

  if (filters?.brand?.length) result = result.filter(p => filters.brand!.includes(p.brand));
  if (filters?.grade?.length) result = result.filter(p => filters.grade!.includes(p.grade));
  if (filters?.category?.length) result = result.filter(p => filters.category!.includes(p.category));
  if (filters?.storage?.length) {
    result = result.filter(p => (p.storage ? filters.storage!.includes(p.storage) : false));
  }
  if (filters?.priceRange) {
    result = result.filter(p => p.price >= filters.priceRange![0] && p.price <= filters.priceRange![1]);
  }
  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(p =>
      p.model.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
  }

  if (sort === 'price_asc') result.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') result.sort((a, b) => b.price - a.price);

  return result;
}

export function useProducts(opts: UseProductsOptions = {}) {
  const { filters, search, sort = 'newest', page = 1, pageSize = 24 } = opts;
  const filtersKey = JSON.stringify(filters ?? null);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Name retained across the Supabase -> Firestore move: consumers use it to
  // tell live data from the bundled fallback, which is still the question.
  const [fromSupabase, setFromRemote] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const snap = await getDocs(query(collection(db, COL.products), fsLimit(FETCH_CAP)));
      if (snap.empty) throw new Error('empty');

      const all = snap.docs.map(d => docToProduct(d.id, d.data()));
      const filtered = applyFilters(all, filters ? JSON.parse(filtersKey) : undefined, search, sort);

      setTotal(filtered.length);
      setProducts(filtered.slice((page - 1) * pageSize, page * pageSize));
      setFromRemote(true);
    } catch {
      const filtered = applyFilters(MOCK_PHONES, filters ? JSON.parse(filtersKey) : undefined, search, sort);
      setTotal(filtered.length);
      setProducts(filtered.slice((page - 1) * pageSize, page * pageSize));
      setFromRemote(false);
    } finally {
      setIsLoading(false);
    }
    // filtersKey stands in for `filters` so a fresh object with the same
    // contents does not retrigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, search, sort, page, pageSize]);

  useEffect(() => { fetch(); }, [fetch]);

  return { products, total, isLoading, error, fromSupabase, refetch: fetch };
}

// ── useProduct — single product by id ─────────────────────────
export function useProduct(id: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setIsLoading(false); return; }

    let cancelled = false;
    setIsLoading(true);

    getDoc(doc(db, COL.products, id))
      .then(snap => {
        if (cancelled) return;
        if (snap.exists()) {
          setProduct(docToProduct(snap.id, snap.data()));
        } else {
          const found = MOCK_PHONES.find(p => p.id === id) ?? null;
          setProduct(found);
          if (!found) setError('Product not found');
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        const found = MOCK_PHONES.find(p => p.id === id) ?? null;
        setProduct(found);
        if (!found) setError('Product not found');
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  return { product, isLoading, error };
}

/** Products matching a search term, used by the API-backed search route. */
export async function searchProducts(term: string, max = 20): Promise<Product[]> {
  const q = term.trim().toLowerCase();
  if (!q) return [];
  const snap = await getDocs(query(
    collection(db, COL.products),
    where('searchTerms', 'array-contains', q),
    fsLimit(max),
  ));
  return snap.docs.map(d => docToProduct(d.id, d.data()));
}

/** Newest-first products, used by the catalogue provider. */
export async function fetchCatalogue(max = FETCH_CAP): Promise<Product[]> {
  const snap = await getDocs(query(
    collection(db, COL.products),
    orderBy('createdAt', 'desc'),
    fsLimit(max),
  ));
  return snap.docs.map(d => docToProduct(d.id, d.data()));
}
