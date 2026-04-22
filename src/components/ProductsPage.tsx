import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MOCK_PHONES } from '../data';
import ProductCard from './ProductCard';
import { useSearch } from '../context/SearchContext';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * ProductsPage — Verified Form design philosophy
 * Space: 12-col grid, sticky sidebar, 24px gaps
 * Colour: white page, grey-5 filter panel, black active states, blue sole accent
 * Typography: DM Sans headers, Inter filter labels, tabular price numerals
 * Motion: 250ms ease-out filter transitions, 70ms stagger on product grid
 */

const GRADE_COLOURS: Record<string, { bg: string; text: string; border: string }> = {
  Pristine:  { bg: 'var(--blue-10)',  text: 'var(--blue-70)',  border: 'var(--blue-20)'  },
  Excellent: { bg: '#ecfdf5',         text: '#065f46',         border: '#a7f3d0'          },
  Good:      { bg: '#fff7ed',         text: '#9a3412',         border: '#fed7aa'          },
  Fair:      { bg: 'var(--grey-5)',   text: 'var(--grey-60)',  border: 'var(--grey-20)'  },
};

const CATEGORY_DEPARTMENTS = [
  {
    id: 'phones',
    label: 'Smartphones',
    intro: 'Certified iPhone, Samsung Galaxy, Google Pixel, OnePlus, and Motorola handsets.',
    matches: ['phones', 'phone', 'smartphones'],
    category: 'Phones',
  },
  {
    id: 'accessories',
    label: 'Accessories',
    intro: 'Audio, earbuds, chargers, and mobile essentials checked for everyday use.',
    matches: ['accessories', 'headphones', 'audio'],
    category: 'Accessories',
  },
  {
    id: 'tablets',
    label: 'Tablets',
    intro: 'iPad, Galaxy Tab, and Windows tablets for work, streaming, and study.',
    matches: ['tablets', 'tablet'],
    category: 'Tablets',
  },
  {
    id: 'computing',
    label: 'Laptops',
    intro: 'MacBook, Dell, and Lenovo laptops ready for productivity demos and everyday work.',
    matches: ['computing', 'laptops', 'laptop'],
    category: 'Computing',
  },
  {
    id: 'gaming',
    label: 'Gaming consoles',
    intro: 'PlayStation, Xbox, and Nintendo consoles with warranty-backed refurbished pricing.',
    matches: ['gaming', 'consoles', 'console'],
    category: 'Gaming',
  },
  {
    id: 'watches',
    label: 'Smartwatches',
    intro: 'Apple Watch, Galaxy Watch, and Pixel Watch models with tested battery health.',
    matches: ['watches', 'smartwatches', 'watch'],
    category: 'Smartwatches',
  },
  {
    id: 'tv',
    label: 'Smart TVs',
    intro: 'Refurbished 4K OLED, QLED, and smart TVs for home cinema demos.',
    matches: ['tv', 'tvs', 'smart-tv', 'smart-tvs'],
    category: 'TV',
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
  const { searchQuery, setSearchQuery, filters, setFilters, resetFilters } = useSearch();
  const location = useLocation();
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
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
  const maxPrice = Math.max(1000, ...scopedProducts.map(p => p.price));

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
      if (filters.grade.length > 0 && !filters.grade.includes(phone.grade)) return false;
      if (phone.price < filters.priceRange[0] || phone.price > filters.priceRange[1]) return false;
      if (filters.storage.length > 0 && phone.specs.storage && !filters.storage.includes(phone.specs.storage)) return false;
      return true;
    });
  }, [scopedProducts, searchQuery, filters]);

  const handleBrandToggle = (brand: string) =>
    setFilters({ ...filters, brand: filters.brand.includes(brand) ? filters.brand.filter(b => b !== brand) : [...filters.brand, brand] });

  const handleGradeToggle = (grade: any) =>
    setFilters({ ...filters, grade: filters.grade.includes(grade) ? filters.grade.filter(g => g !== grade) : [...filters.grade, grade] });

  const handlePriceChange = (min: number, max: number) =>
    setFilters({ ...filters, priceRange: [min, max] });

  const hasActiveFilters =
    filters.brand.length > 0 || filters.grade.length > 0 ||
    filters.priceRange[0] !== 0 || filters.priceRange[1] !== maxPrice ||
    filters.storage.length > 0;

  const pageTitle = brandCategory?.label || selectedDepartment?.label || (dealOnly ? 'Good deals' : 'Certified refurbished devices');
  const pageIntro = brandCategory?.intro || selectedDepartment?.intro || (dealOnly
    ? 'The strongest savings across every department, still tested and warranty-backed.'
    : 'Phones, tablets, laptops, watches, consoles, TVs, and accessories tested for demo-ready browsing.');
  const pageLabel = brandCategory || selectedDepartment || dealOnly ? 'Department' : 'All devices';
  const activeDepartmentId = selectedDepartment?.id || (brandCategory ? 'phones' : dealOnly ? 'deals' : 'all');

  // ── Filter panel (shared between desktop sticky + mobile drawer) ──────────
  const FilterPanel = () => (
    <div
      style={{
        background: 'var(--grey-0)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--grey-10)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 'var(--spacing-16) var(--spacing-20)',
          borderBottom: '1px solid var(--grey-10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--grey-50)',
          }}
        >
          Filters
        </span>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--blue-60)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            <X size={12} /> Clear all
          </button>
        )}
      </div>

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

      {/* Condition / Grade */}
      <FilterGroup title="Condition">
        {grades.map(grade => {
          const colours = GRADE_COLOURS[grade] || GRADE_COLOURS.Fair;
          return (
            <label
              key={grade}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '3px 0' }}
            >
              <input
                type="checkbox"
                checked={filters.grade.includes(grade)}
                onChange={() => handleGradeToggle(grade)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--blue-60)', flexShrink: 0, cursor: 'pointer' }}
              />
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: colours.bg,
                  border: `1px solid ${colours.border}`,
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: colours.text,
                }}
              >
                {grade}
              </span>
            </label>
          );
        })}
      </FilterGroup>

      {/* Price Range */}
      <FilterGroup title="Price Range">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)' }}>£{filters.priceRange[0]}</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)' }}>£{filters.priceRange[1]}</span>
        </div>
        <input
          type="range" min="0" max={maxPrice} value={filters.priceRange[0]}
          onChange={e => handlePriceChange(Number(e.target.value), filters.priceRange[1])}
          style={{ width: '100%', accentColor: 'var(--blue-60)', marginBottom: '8px' }}
        />
        <input
          type="range" min="0" max={maxPrice} value={filters.priceRange[1]}
          onChange={e => handlePriceChange(filters.priceRange[0], Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--blue-60)' }}
        />
      </FilterGroup>
    </div>
  );

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

        {/* Department shortcuts */}
        <nav
          aria-label="Product departments"
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: 'var(--spacing-16)',
            marginBottom: 'var(--spacing-24)',
            scrollbarWidth: 'thin',
          }}
        >
          {[
            { id: 'all', label: 'All', href: '/products', count: MOCK_PHONES.length },
            { id: 'deals', label: 'Deals', href: '/products?deal=true', count: MOCK_PHONES.filter(product => product.originalPrice > product.price && ((product.originalPrice - product.price) / product.originalPrice) >= 0.35).length },
            ...CATEGORY_DEPARTMENTS.map(department => ({
              id: department.id,
              label: department.label,
              href: `/products?category=${department.id}`,
              count: MOCK_PHONES.filter(product => product.category === department.category).length,
            })),
          ].map(department => {
            const isActive = activeDepartmentId === department.id;
            return (
              <Link
                key={department.id}
                to={department.href}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: 'var(--radius-full)',
                  border: isActive ? '1.5px solid var(--black)' : '1px solid var(--grey-20)',
                  background: isActive ? 'var(--black)' : 'var(--grey-0)',
                  color: isActive ? 'white' : 'var(--grey-60)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {department.label}
                <span
                  style={{
                    fontSize: '11px',
                    color: isActive ? 'rgba(255,255,255,0.72)' : 'var(--grey-40)',
                  }}
                >
                  {department.count}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* ── Search bar ─────────────────────────────────── */}
        <div
          style={{
            position: 'relative',
            marginBottom: 'var(--spacing-32)',
            maxWidth: '640px',
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--grey-40)',
              pointerEvents: 'none',
            }}
          />
          <input
            id="products-search"
            type="text"
            placeholder="Search model, brand, spec..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '48px',
              paddingLeft: '48px',
              paddingRight: searchQuery ? '44px' : '16px',
              background: 'var(--grey-5)',
              border: '1.5px solid var(--grey-10)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--black)',
              outline: 'none',
              transition: 'border-color var(--duration-fast)',
              boxSizing: 'border-box',
            }}
            onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--blue-60)'; }}
            onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--grey-10)'; }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-40)', display: 'flex',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Mobile filter toggle */}
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-20)' }}
          className="lg:hidden"
        >
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)' }}>
            {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}
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
                  Showing <strong style={{ color: 'var(--black)', fontWeight: 700 }}>{filteredProducts.length}</strong> of {scopedProducts.length} item{scopedProducts.length !== 1 ? 's' : ''}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Price ↑', 'Price ↓', 'Condition'].map(sort => (
                    <button
                      key={sort}
                      style={{
                        height: '30px', padding: '0 10px',
                        fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 500,
                        color: 'var(--grey-60)', background: 'none',
                        border: '1.5px solid var(--grey-10)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      }}
                    >
                      {sort}
                    </button>
                  ))}
                </div>
              </div>

              {filteredProducts.length === 0 ? (
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
                    }}
                  >
                    <Search size={28} style={{ color: 'var(--grey-30)' }} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 800, color: 'var(--black)', marginBottom: '8px' }}>
                    No results
                  </h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)', marginBottom: 'var(--spacing-24)' }}>
                    Try adjusting your search or clearing the filters
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
                  {filteredProducts.map((phone, index) => (
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
    <div
      style={{
        padding: 'var(--spacing-16) var(--spacing-20)',
        borderBottom: '1px solid var(--grey-10)',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--grey-40)',
          marginBottom: '12px',
        }}
      >
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {children}
      </div>
    </div>
  );
}

function FilterCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: '16px', height: '16px', accentColor: 'var(--blue-60)', cursor: 'pointer' }}
      />
      <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: checked ? 600 : 400, color: checked ? 'var(--black)' : 'var(--grey-60)' }}>
        {label}
      </span>
    </label>
  );
}
