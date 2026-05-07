import { useState, useEffect, useCallback } from 'react';
import { Product, FilterState, ProductGrade } from '../types';
import { MOCK_PHONES } from '../data';
import { supabase } from '../lib/supabase';

function rowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    model: row.model as string,
    brand: row.brand as string,
    category: row.category as Product['category'],
    storage: (row.storage as string) ?? undefined,
    price: row.price as number,
    originalPrice: row.original_price as number,
    grade: row.grade as ProductGrade,
    batteryHealth: row.battery_health as number,
    warrantyMonths: row.warranty_months as number,
    returnDays: row.return_days as number,
    imageUrl: (row.image_url as string) ?? '',
    galleryImages: (row.gallery_images as string[]) ?? undefined,
    isCertified: row.is_certified as boolean,
    stock: row.stock as number,
    specs: (row.specs as Product['specs']) ?? {},
    description: (row.description as string) ?? undefined,
    conditionDescription: (row.condition_description as string) ?? undefined,
    colorOptions: (row.color_options as string[]) ?? undefined,
    storageOptions: (row.storage_options as string[]) ?? undefined,
    conditionOptions: (row.condition_options as ProductGrade[]) ?? undefined,
  };
}

// ── useProducts — paginated, filtered list ────────────────────
export interface UseProductsOptions {
  filters?: Partial<FilterState>;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'relevance';
  page?: number;
  pageSize?: number;
}

export function useProducts(opts: UseProductsOptions = {}) {
  const { filters, search, sort = 'newest', page = 1, pageSize = 24 } = opts;
  // Stringify object deps so useCallback uses value equality, not reference equality
  const filtersKey = JSON.stringify(filters ?? null);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromSupabase, setFromSupabase] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from('products').select('*', { count: 'exact' });

      if (filters?.brand?.length) query = query.in('brand', filters.brand);
      if (filters?.grade?.length) query = query.in('grade', filters.grade);
      if (filters?.category?.length) query = query.in('category', filters.category);
      if (filters?.storage?.length) query = query.in('storage', filters.storage);
      if (filters?.priceRange) {
        query = query
          .gte('price', filters.priceRange[0])
          .lte('price', filters.priceRange[1]);
      }
      if (search?.trim()) {
        query = query.or(`model.ilike.%${search}%,brand.ilike.%${search}%`);
      }

      switch (sort) {
        case 'price_asc':  query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        default:           query = query.order('created_at', { ascending: false });
      }

      query = query.range((page - 1) * pageSize, page * pageSize - 1);

      const { data, error: qErr, count } = await query;

      if (qErr) throw qErr;
      if (!data || data.length === 0) throw new Error('empty');

      setProducts(data.map(r => rowToProduct(r as Record<string, unknown>)));
      setTotal(count ?? 0);
      setFromSupabase(true);
    } catch {
      // Graceful fallback: filter the static MOCK_PHONES
      let result = [...MOCK_PHONES];

      if (filters?.brand?.length) result = result.filter(p => filters.brand!.includes(p.brand));
      if (filters?.grade?.length) result = result.filter(p => filters.grade!.includes(p.grade));
      if (filters?.category?.length) result = result.filter(p => filters.category!.includes(p.category));
      if (filters?.storage?.length) result = result.filter(p => p.storage ? filters.storage!.includes(p.storage) : false);
      if (filters?.priceRange) result = result.filter(p => p.price >= filters.priceRange![0] && p.price <= filters.priceRange![1]);
      if (search?.trim()) {
        const q = search.trim().toLowerCase();
        result = result.filter(p =>
          p.model.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
        );
      }

      if (sort === 'price_asc') result.sort((a, b) => a.price - b.price);
      else if (sort === 'price_desc') result.sort((a, b) => b.price - a.price);

      setTotal(result.length);
      setProducts(result.slice((page - 1) * pageSize, page * pageSize));
      setFromSupabase(false);
    } finally {
      setIsLoading(false);
    }
  }, [filtersKey, search, sort, page, pageSize]);

  useEffect(() => { fetch(); }, [fetch]);

  return { products, total, isLoading, error, fromSupabase, refetch: fetch };
}

// ── useProduct — single product by ID ────────────────────────
export function useProduct(id: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setIsLoading(false); return; }

    setIsLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('products') as any)
      .select('*, product_variants(*)')
      .eq('id', id)
      .single()
      .then(({ data, error: qErr }: { data: Record<string, unknown> | null; error: unknown }) => {
        if (!qErr && data) {
          const p = rowToProduct(data);
          if (Array.isArray(data.product_variants) && (data.product_variants as unknown[]).length > 0) {
            p.variants = (data.product_variants as Record<string, unknown>[]).map(v => ({
              id: v.id as string,
              color: (v.color as string) ?? undefined,
              storage: (v.storage as string) ?? undefined,
              condition: (v.condition as ProductGrade) ?? undefined,
              price: v.price as number,
              originalPrice: v.original_price as number,
              stock: v.stock as number,
              batteryHealth: (v.battery_health as number) ?? undefined,
              imageUrl: (v.image_url as string) ?? undefined,
              galleryImages: (v.gallery_images as string[]) ?? undefined,
            }));
          }
          setProduct(p);
        } else {
          const found = MOCK_PHONES.find(p => p.id === id) ?? null;
          setProduct(found);
          if (!found) setError('Product not found');
        }
        setIsLoading(false);
      });
  }, [id]);

  return { product, isLoading, error };
}
