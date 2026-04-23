import React, { useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MOCK_PHONES } from '../data';
import ProductCard from './ProductCard';
import { useSearch } from '../context/SearchContext';
import { SlidersHorizontal, ChevronDown, SearchX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type SortKey = 'price-asc' | 'price-desc' | 'condition' | null;

const GRADE_ORDER: Record<string, number> = {
  Pristine: 0, New: 0, Excellent: 1, Good: 2, Fair: 3,
};

/**
 * ProductsPage — Verified Form design philosophy
 * Space: 12-col grid, sticky sidebar, 24px gaps
 * Colour: white page, grey-5 filter panel, black active states, blue sole accent
 * Typography: DM Sans headers, Inter filter labels, tabular price numerals
 * Motion: 250ms ease-out filter transitions, 70ms stagger on product grid
 */

const CATEGORY_DEPARTMENTS = [
  {
    id: 'apple',
    label: 'Apple',
    intro: 'Latest iPhones and refurbished Apple devices.',
    matches: ['apple', 'iphone', 'ios'],
    category: 'Apple',
  },
  {
    id: 'samsung',
    label: 'Samsung',
    intro: 'Samsung Galaxy smartphones and accessories.',
    matches: ['samsung', 'galaxy', 'android'],
    category: 'Samsung',
  },
  {
    id: 'google',
    label: 'Google',
    intro: 'Google Pixel phones and smart technology.',
    matches: ['google', 'pixel'],
    category: 'Google',
  },
  {
    id: 'tablets',
    label: 'Ipads & Tabs',
    intro: 'iPads and Android tablets for work and play.',
    matches: ['tablets', 'tablet', 'ipad'],
    category: 'Ipads & Tabs',
  },
  {
    id: 'accessories',
    label: 'Accessories',
    intro: 'Cases, chargers, and essential mobile add-ons.',
    matches: ['accessories', 'accessory'],
    category: 'Accessories',
  },
  {
    id: 'speakers',
    label: 'Speakers',
    intro: 'Bluetooth and portable speakers for every occasion.',
    matches: ['speakers', 'speaker', 'audio'],
    category: 'Speakers',
  },
  {
    id: 'hearables',
    label: 'Hearables',
    intro: 'High-quality headphones and wireless earbuds.',
    matches: ['hearables', 'hearable', 'headphones', 'earbuds'],
    category: 'Hearables',
  },
  {
    id: 'playables',
    label: 'Playables',
    intro: 'Gaming consoles, VR headsets, and interactive gear.',
    matches: ['playables', 'playable', 'gaming', 'console', 'ps5', 'xbox', 'nintendo'],
    category: 'Playables',
  },
];

const BRAND_CATEGORY_MATCHES: Record<string, { label: string; brand: string; category: string; intro: string }> = {
  'phones-apple': {
    label: 'Apple iPhone',
    brand: 'Apple',
    category: 'Phones',
    intro: 'Refurbished iPhone models with battery health, warranty, and transparent grading.',
  },
  'phones-samsung': {
    label: 'Samsung Galaxy',
    brand: 'Samsung',
    category: 'Phones',
    intro: 'Samsung Galaxy phones across flagship and value ranges.',
  },
  'phones-google': {
    label: 'Google Pixel',
    brand: 'Google',
    category: 'Phones',
    intro: 'Pixel devices with strong cameras, clean Android, and certified condition checks.',
  },
};

export default function ProductsPage() {
  const { searchQuery, filters, setFilters, resetFilters } = useSearch();
  const location = useLocation();
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortKey>(null);

  // Scroll to top on every navigation change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.search]);

  const searchParams = new URLSearchParams(location.search);
  const categoryParam = searchParams.get('category')?.toLowerCase() || '';
  const dealOnly = searchParams.get('deal') === 'true';
  const brandCategory = BRAND_CATEGORY_MATCHES[categoryParam];
  const selectedDepartment = CATEGORY_DEPARTMENTS.find(department => department.matches.includes(categoryParam));

  const scopedProducts = useMemo(() => {
    return MOCK_PHONES.filter(product => {
      if (brandCategory) {
        return product.category === brandCategory.category && product.brand === brandCategory.brand;
      }
      if (selectedDepartment) {
        return product.category === selectedDepartment.category;
      }
      if (dealOnly) {
        return product.originalPrice > product.price && ((product.originalPrice - product.price) / product.originalPrice) >= 0.35;
      }
      return true;
    });
  }, [brandCategory, selectedDepartment, dealOnly]);

  const brands  = Array.from(new Set(scopedProducts.map(p => p.brand))).sort();
  const grades  = Array.from(new Set(scopedProducts.map(p => p.grade)));
  const categories = Array.from(new Set(MOCK_PHONES.map(p => p.category)));

  const filteredProducts = useMemo(() => {
    return scopedProducts.filter(phone => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          phone.model.toLowerCase().includes(q) ||
          phone.brand.toLowerCase().includes(q) ||
          phone.category.toLowerCase().includes(q) ||
          phone.specs.processor?.toLowerCase().includes(q) ||
          phone.specs.display?.toLowerCase().includes(q) ||
          phone.specs.features?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filters.brand.length > 0 && !filters.brand.includes(phone.brand)) return false;
      if (filters.category && filters.category.length > 0 && !filters.category.includes(phone.category)) return false;
      if (filters.grade.length > 0 && !filters.grade.includes(phone.grade)) return false;
      if (phone.price < filters.priceRange[0] || phone.price > filters.priceRange[1]) return false;
      if (filters.storage.length > 0 && phone.specs.storage && !filters.storage.includes(phone.specs.storage)) return false;
      return true;
    });
  }, [scopedProducts, searchQuery, filters]);

  const sortedProducts = useMemo(() => {
    if (!sortBy) return filteredProducts;
    const copy = [...filteredProducts];
    if (sortBy === 'price-asc')  copy.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') copy.sort((a, b) => b.price - a.price);
    if (sortBy === 'condition')  copy.sort((a, b) => (GRADE_ORDER[a.grade] ?? 99) - (GRADE_ORDER[b.grade] ?? 99));
    return copy;
  }, [filteredProducts, sortBy]);

  const handleBrandToggle = (brand: string) =>
    setFilters({ ...filters, brand: filters.brand.includes(brand) ? filters.brand.filter(b => b !== brand) : [...filters.brand, brand] });

  const handleCategoryToggle = (category: string) =>
    setFilters({ ...filters, category: filters.category?.includes(category) ? filters.category.filter(c => c !== category) : [...(filters.category || []), category] });

  const handleGradeToggle = (grade: any) =>
    setFilters({ ...filters, grade: filters.grade.includes(grade) ? filters.grade.filter(g => g !== grade) : [...filters.grade, grade] });

  const handlePriceChange = (min: number, max: number) =>
    setFilters({ ...filters, priceRange: [min, max] });

  const hasActiveFilters =
    filters.brand.length > 0 || filters.grade.length > 0 || (filters.category && filters.category.length > 0) ||
    filters.priceRange[0] !== 0 || filters.priceRange[1] !== 1500 ||
    filters.storage.length > 0;

  const pageTitle = brandCategory?.label || selectedDepartment?.label || (dealOnly ? 'Good deals' : 'Certified refurbished devices');
  const pageIntro = brandCategory?.intro || selectedDepartment?.intro || (dealOnly
    ? 'The strongest savings across every department, still tested and warranty-backed.'
    : 'Phones, tablets, laptops, watches, consoles, and accessories — tested and warranty-backed.');
  const pageLabel = brandCategory || selectedDepartment || dealOnly ? 'Department' : 'All devices';

  // ── Filter panel (shared between desktop sticky + mobile drawer) ──────────
  const FilterPanel = () => {
    const [minPrice, setMinPrice] = React.useState(filters.priceRange[0].toString());
    const [maxPriceInput, setMaxPriceInput] = React.useState(filters.priceRange[1] === 1500 ? '' : filters.priceRange[1].toString());

    const handlePriceSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const min = parseInt(minPrice) || 0;
      const max = parseInt(maxPriceInput) || 1500;
      handlePriceChange(min, max);
    };

    return (
      <div style={{ padding: '0 16px' }}>
        {hasActiveFilters && (
          <button onClick={resetFilters} style={{ fontSize: '13px', color: 'var(--brand-cyan)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '16px' }}>
            &lt; Clear all filters
          </button>
        )}

        {/* Category / Department */}
        <FilterGroup title="Department">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => handleCategoryToggle(category)}
              style={{
                display: 'block',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                padding: '4px 0',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                color: filters.category?.includes(category) ? 'var(--brand-cyan)' : 'var(--black)',
                fontWeight: filters.category?.includes(category) ? 700 : 400
              }}
            >
              {category}
            </button>
          ))}
        </FilterGroup>

        {/* Brand */}
        <FilterGroup title="Brand">
          {brands.map(brand => (
            <FilterCheckbox
              key={brand}
              label={brand}
              checked={filters.brand.includes(brand)}
              onChange={() => handleBrandToggle(brand)}
            />
          ))}
        </FilterGroup>

        {/* Condition */}
        <FilterGroup title="Condition">
          {grades.map(grade => (
            <FilterCheckbox
              key={grade}
              label={grade}
              checked={filters.grade.includes(grade)}
              onChange={() => handleGradeToggle(grade)}
            />
          ))}
        </FilterGroup>

        {/* Price */}
        <FilterGroup title="Price">
          <form onSubmit={handlePriceSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              placeholder="Min"
              aria-label="Minimum price"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              style={{ width: '64px', height: '32px', padding: '0 8px', border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontFamily: 'var(--font-body)' }}
            />
            <span style={{ color: 'var(--grey-50)' }}>–</span>
            <input
              type="number"
              placeholder="Max"
              aria-label="Maximum price"
              value={maxPriceInput}
              onChange={e => setMaxPriceInput(e.target.value)}
              style={{ width: '64px', height: '32px', padding: '0 8px', border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontFamily: 'var(--font-body)' }}
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              Go
            </button>
          </form>
        </FilterGroup>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--grey-0)', paddingBottom: 'var(--spacing-80)' }}>
      <div
        className="container-bm"
        style={{ maxWidth: 'var(--container-max)', paddingTop: 'var(--spacing-48)' }}
      >
        {/* ── Page header ──────────────────────────────── */}
        <div style={{ marginBottom: 'var(--spacing-32)' }}>
          <div className="overline mb-3">{pageLabel}</div>
          <h1
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--black)',
              lineHeight: 1.1,
              marginBottom: '8px',
            }}
          >
            {pageTitle}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-50)', maxWidth: '440px' }}>
            {pageIntro} {scopedProducts.length} item{scopedProducts.length !== 1 ? 's' : ''} available.
          </p>
        </div>

        {/* Mobile filter toggle */}
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-20)' }}
          className="lg:hidden"
        >
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)' }}>
            {sortedProducts.length} result{sortedProducts.length !== 1 ? 's' : ''}
          </span>
          <button
            id="products-filter-toggle"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              height: '36px', padding: '0 14px',
              background: 'var(--grey-0)', border: '1.5px solid var(--grey-20)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
              color: 'var(--black)', cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={14} /> Filters {hasActiveFilters && `(${filters.brand.length + filters.grade.length})`}
            <ChevronDown size={12} style={{ transform: isFilterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>

        {/* Mobile filter drawer */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: 'var(--spacing-20)' }}
              className="lg:hidden"
            >
              <FilterPanel />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main grid (sidebar + products) ─────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-32)' }} className="lg:products-grid">
          <div style={{ display: 'contents' }} className="lg:grid lg:grid-cols-4 lg:gap-8">

            {/* Desktop sticky sidebar */}
            <div style={{ position: 'sticky', top: '120px', alignSelf: 'start' }} className="hidden lg:block">
              <FilterPanel />
            </div>

            {/* Product Grid */}
            <div className="lg:col-span-3">
              {/* Results count + sort */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--spacing-20)',
                  paddingBottom: 'var(--spacing-16)',
                  borderBottom: '1px solid var(--grey-10)',
                }}
              >
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)' }}>
                  Showing <strong style={{ color: 'var(--black)', fontWeight: 700 }}>{sortedProducts.length}</strong> of {scopedProducts.length} item{scopedProducts.length !== 1 ? 's' : ''}
                </p>
                <div style={{ display: 'flex', gap: '8px' }} role="group" aria-label="Sort products">
                  {([
                    { key: 'price-asc' as const,  label: 'Price ↑' },
                    { key: 'price-desc' as const, label: 'Price ↓' },
                    { key: 'condition' as const,  label: 'Condition' },
                  ]).map(({ key, label }) => {
                    const active = sortBy === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSortBy(active ? null : key)}
                        aria-pressed={active}
                        style={{
                          height: '32px', padding: '0 12px',
                          fontFamily: 'var(--font-body)', fontSize: '12px',
                          fontWeight: active ? 700 : 500,
                          color: active ? 'var(--grey-0)' : 'var(--grey-60)',
                          background: active ? 'var(--black)' : 'var(--grey-0)',
                          border: `1.5px solid ${active ? 'var(--black)' : 'var(--grey-20)'}`,
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          transition: 'all var(--duration-fast) var(--ease-default)',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {sortedProducts.length === 0 ? (
                <div
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: 'var(--spacing-80) 0', textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '64px', height: '64px',
                      borderRadius: '50%', background: 'var(--grey-5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 'var(--spacing-20)',
                      color: 'var(--grey-40)',
                    }}
                  >
                    <SearchX size={28} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 800, color: 'var(--black)', marginBottom: '8px' }}>
                    No results
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)', marginBottom: 'var(--spacing-24)', maxWidth: '360px' }}>
                    Try adjusting your search or clearing the filters.
                  </p>
                  <button
                    onClick={resetFilters}
                    className="btn btn-primary btn-md"
                    id="products-clear-filters"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: 'var(--spacing-20)',
                  }}
                >
                  {sortedProducts.map((phone, index) => (
                    <motion.div
                      key={phone.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index, 7) * 0.07, duration: 0.35, ease: [0.2, 0, 0, 1] }}
                    >
                      <ProductCard phone={phone} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────── */
function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 700, color: 'var(--black)', marginBottom: '8px' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {children}
      </div>
    </div>
  );
}

function FilterCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: '16px', height: '16px', accentColor: 'var(--brand-cyan)', cursor: 'pointer', margin: 0 }} />
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--black)' }}>
        {label}
      </span>
    </label>
  );
}
