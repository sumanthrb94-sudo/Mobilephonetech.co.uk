import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product } from '../types';
import { fetchCatalogue } from '../hooks/useProducts';

interface CatalogueValue {
  /** Listed products from the live database. Empty until it answers, or if it cannot be reached. */
  products: Product[];
  isLoading: boolean;
  /**
   * True once `products` came from the live database. False while loading or
   * when it could not be reached — the shop then shows no products rather
   * than sample ones. Named for Supabase originally; kept for its callers.
   */
  fromSupabase: boolean;
}

/**
 * No bundled catalogue: a shop that cannot reach its database shows nothing
 * for sale rather than products that do not exist and cannot be ordered.
 */
const CatalogueContext = createContext<CatalogueValue>({
  products: [],
  isLoading: false,
  fromSupabase: false,
});

// The storefront is ~133 products; one request keeps every consumer consistent
// and avoids a dozen components each issuing their own query.
const CATALOGUE_LIMIT = 500;

export function CatalogueProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts]         = useState<Product[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [fromSupabase, setFromSupabase] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rows = await fetchCatalogue(CATALOGUE_LIMIT);
        if (cancelled) return;

        setProducts(rows);
        setFromSupabase(true);
      } catch {
        // Nothing to show. Consumers read fromSupabase to explain why.
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
