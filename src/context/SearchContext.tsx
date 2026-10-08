import React, { createContext, useContext, useState, useMemo } from 'react';
import { FilterState } from '../types';
import { useCatalogue } from './CatalogueContext';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  /** The catalogue-wide price ceiling, derived from the live catalogue. */
  priceCap: number;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

/** Round up to the next £100 so the slider's upper handle lands on a
 *  round number rather than a messy £1709. */
function computePriceCap(products: { price: number; originalPrice?: number }[]): number {
  const max = products.reduce(
    (m, p) => Math.max(m, p.originalPrice ?? p.price, p.price),
    0,
  );
  return Math.max(1500, Math.ceil(max / 100) * 100);
}

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const { products } = useCatalogue();
  const priceCap = useMemo(() => computePriceCap(products), [products]);
  const defaultFilters: FilterState = useMemo(
    () => ({
      brand: [],
      grade: [],
      priceRange: [0, priceCap],
      storage: [],
      category: [],
    }),
    [priceCap],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSearchQuery('');
  };

  return (
    <SearchContext.Provider
      value={{ searchQuery, setSearchQuery, filters, setFilters, resetFilters, priceCap }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearch must be used within SearchProvider');
  return context;
}
