import React, { createContext, useContext, useState } from 'react';
import { FilterState } from '../types';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  resetFilters: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

const DEFAULT_FILTERS: FilterState = {
  brand: [],
  grade: [],
  priceRange: [0, 1000],
  storage: [],
};

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
  };

  return (
    <SearchContext.Provider value={{
      searchQuery,
      setSearchQuery,
      filters,
      setFilters,
      resetFilters,
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within SearchProvider');
  }
  return context;
}
