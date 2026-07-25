import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product } from '../types';
import { MOCK_PHONES } from '../data';
import { supabase } from '../lib/supabase';
import { rowToProduct } from '../hooks/useProducts';

interface CatalogueValue {
  /** Live inventory when the database is reachable, bundled sample data otherwise. */
  products: Product[];
  isLoading: boolean;
  /** False means `products` is the MOCK_PHONES fallback, not live stock. */
  fromSupabase: boolean;
}

/**
 * Default value is the bundled catalogue rather than an empty array so that
 * components rendered outside the provider — unit tests, Storybook-style
 * one-offs — still get something sensible instead of throwing or rendering
 * empty grids.
 */
const CatalogueContext = createContext<CatalogueValue>({
  products: MOCK_PHONES,
  isLoading: false,
  fromSupabase: false,
});

// The storefront is ~133 products; one request keeps every consumer consistent
// and avoids a dozen components each issuing their own query.
const CATALOGUE_LIMIT = 500;

export function CatalogueProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts]         = useState<Product[]>(MOCK_PHONES);
  const [isLoading, setIsLoading]       = useState(true);
  const [fromSupabase, setFromSupabase] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(CATALOGUE_LIMIT);

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('empty');
        if (cancelled) return;

        setProducts(data.map(r => rowToProduct(r as Record<string, unknown>)));
        setFromSupabase(true);
      } catch {
        // Keep the bundled catalogue already in state — the storefront stays
        // browsable, and consumers can read fromSupabase to say so.
        if (!cancelled) setFromSupabase(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <CatalogueContext.Provider value={{ products, isLoading, fromSupabase }}>
      {children}
    </CatalogueContext.Provider>
  );
}

export function useCatalogue() {
  return useContext(CatalogueContext);
}
