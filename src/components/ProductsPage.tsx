import React, { useMemo } from 'react';
import { MOCK_PHONES } from '../data';
import ProductCard from './ProductCard';
import { useSearch } from '../context/SearchContext';
import { Search, Filter, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ProductsPage() {
  const { searchQuery, setSearchQuery, filters, setFilters, resetFilters } = useSearch();
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const brands = Array.from(new Set(MOCK_PHONES.map(p => p.brand)));
  const grades = Array.from(new Set(MOCK_PHONES.map(p => p.grade)));
  const maxPrice = Math.max(...MOCK_PHONES.map(p => p.price));

  const filteredProducts = useMemo(() => {
    return MOCK_PHONES.filter(phone => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          phone.model.toLowerCase().includes(query) ||
          phone.brand.toLowerCase().includes(query) ||
          phone.specs.processor?.toLowerCase().includes(query) ||
          phone.specs.display?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Brand filter
      if (filters.brand.length > 0 && !filters.brand.includes(phone.brand)) {
        return false;
      }

      // Grade filter
      if (filters.grade.length > 0 && !filters.grade.includes(phone.grade)) {
        return false;
      }

      // Price range filter
      if (phone.price < filters.priceRange[0] || phone.price > filters.priceRange[1]) {
        return false;
      }

      // Storage filter
      if (filters.storage.length > 0 && phone.specs.storage && !filters.storage.includes(phone.specs.storage)) {
        return false;
      }

      return true;
    });
  }, [searchQuery, filters]);

  const handleBrandToggle = (brand: string) => {
    setFilters({
      ...filters,
      brand: filters.brand.includes(brand)
        ? filters.brand.filter(b => b !== brand)
        : [...filters.brand, brand],
    });
  };

  const handleGradeToggle = (grade: any) => {
    setFilters({
      ...filters,
      grade: filters.grade.includes(grade)
        ? filters.grade.filter(g => g !== grade)
        : [...filters.grade, grade],
    });
  };

  const handlePriceChange = (min: number, max: number) => {
    setFilters({
      ...filters,
      priceRange: [min, max],
    });
  };

  const hasActiveFilters = filters.brand.length > 0 || filters.grade.length > 0 || 
                           filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice ||
                           filters.storage.length > 0;

  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">Browse Products</h1>
          <p className="text-lg text-slate-500 font-medium">Find the perfect refurbished device for you</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by model, brand, processor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl bg-slate-100 py-4 pl-12 pr-4 text-sm font-bold outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="flex items-center justify-between lg:hidden">
                <h3 className="font-black text-slate-900">Filters</h3>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Filter className="h-5 w-5" />
                </button>
              </div>

              <AnimatePresence>
                {(isFilterOpen || window.innerWidth >= 1024) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6"
                  >
                    {/* Clear Filters */}
                    {hasActiveFilters && (
                      <button
                        onClick={resetFilters}
                        className="w-full px-4 py-2 bg-slate-100 text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Clear All Filters
                      </button>
                    )}

                    {/* Brand Filter */}
                    <div className="border-t border-slate-100 pt-6">
                      <h4 className="font-black text-slate-900 mb-4 text-sm uppercase tracking-widest">Brand</h4>
                      <div className="space-y-2">
                        {brands.map(brand => (
                          <label key={brand} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters.brand.includes(brand)}
                              onChange={() => handleBrandToggle(brand)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-slate-600">{brand}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Grade Filter */}
                    <div className="border-t border-slate-100 pt-6">
                      <h4 className="font-black text-slate-900 mb-4 text-sm uppercase tracking-widest">Condition</h4>
                      <div className="space-y-2">
                        {grades.map(grade => (
                          <label key={grade} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters.grade.includes(grade)}
                              onChange={() => handleGradeToggle(grade)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-slate-600">{grade}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Price Range Filter */}
                    <div className="border-t border-slate-100 pt-6">
                      <h4 className="font-black text-slate-900 mb-4 text-sm uppercase tracking-widest">Price Range</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Min: £{filters.priceRange[0]}</label>
                          <input
                            type="range"
                            min="0"
                            max={maxPrice}
                            value={filters.priceRange[0]}
                            onChange={(e) => handlePriceChange(Number(e.target.value), filters.priceRange[1])}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Max: £{filters.priceRange[1]}</label>
                          <input
                            type="range"
                            min="0"
                            max={maxPrice}
                            value={filters.priceRange[1]}
                            onChange={(e) => handlePriceChange(filters.priceRange[0], Number(e.target.value))}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">No products found</h3>
                <p className="text-slate-500 font-medium mb-6">Try adjusting your search or filters</p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-600">
                    Showing <span className="text-slate-900">{filteredProducts.length}</span> of <span className="text-slate-900">{MOCK_PHONES.length}</span> products
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.map((phone) => (
                    <ProductCard key={phone.id} phone={phone} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
