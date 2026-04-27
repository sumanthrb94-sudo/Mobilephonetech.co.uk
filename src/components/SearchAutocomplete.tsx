import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MOCK_PHONES } from '../data';
import { useSearch } from '../context/SearchContext';
import ProductImage from './ProductImage';

const RECENT_KEY = 'mobilephonemarket:recent-searches';
const MAX_RECENT = 6;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {}
}

/**
 * SearchAutocomplete — navbar search input + dropdown results.
 * - Debounced fuzzy match against MOCK_PHONES
 * - Persisted recent searches
 * - Keyboard navigation (↑/↓ to move, Enter to submit or open, Esc to close)
 * - Click-outside dismiss
 */
export default function SearchAutocomplete({
  placeholder = 'Search iPhone, Galaxy, Pixel…',
}: {
  placeholder?: string;
}) {
  const { searchQuery, setSearchQuery } = useSearch();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>(() => (typeof window === 'undefined' ? [] : loadRecent()));
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const matches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return MOCK_PHONES.filter((p) =>
      p.model.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q),
    ).slice(0, 6);
  }, [searchQuery]);

  const showPanel = isOpen && (searchQuery.trim().length > 0 || recent.length > 0);

  const submit = (value?: string) => {
    const q = (value ?? searchQuery).trim();
    if (!q) return;
    const next = [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
    setRecent(next);
    saveRecent(next);
    setIsOpen(false);
    navigate(`/products?search=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && matches[activeIndex]) {
        setIsOpen(false);
        navigate(`/product/${matches[activeIndex].id}`);
      } else {
        submit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clearRecent = () => {
    setRecent([]);
    saveRecent([]);
  };

  return (
    <div ref={containerRef} className="hidden md:flex flex-grow max-w-xl relative" role="search">
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        style={{ position: 'relative', width: '100%' }}
      >
        <Search
          size={18}
          style={{
            position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--grey-50)', pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="search-listbox"
          aria-autocomplete="list"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setIsOpen(true); setActiveIndex(-1); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
          style={{
            width: '100%',
            paddingLeft: '44px', paddingRight: '16px',
            height: '40px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--grey-0)',
            border: '1px solid transparent',
            color: 'var(--black)',
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
            outline: 'none',
          }}
          aria-label="Search products"
        />
      </form>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            id="search-listbox"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0, right: 0,
              background: 'var(--grey-0)',
              border: '1px solid var(--grey-10)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '420px',
              overflowY: 'auto',
              zIndex: 70,
            }}
          >
            {matches.length === 0 && recent.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 6px', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-50)' }}>
                  <span>Recent</span>
                  <button
                    onClick={clearRecent}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--grey-50)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em' }}
                  >
                    Clear
                  </button>
                </div>
                {recent.map((r, i) => (
                  <button
                    key={`r-${i}`}
                    onClick={() => { setSearchQuery(r); submit(r); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      width: '100%', padding: '10px 16px', background: 'transparent', border: 'none',
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-70)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--grey-5)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Clock size={14} style={{ color: 'var(--grey-40)' }} />
                    <span>{r}</span>
                  </button>
                ))}
              </>
            )}

            {matches.length > 0 && (
              <>
                <div style={{ padding: '10px 16px 6px', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-50)' }}>
                  Top matches
                </div>
                {matches.map((m, i) => {
                  const isActive = i === activeIndex;
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2, ease: [0.2, 0, 0, 1] }}
                    >
                      <Link
                        to={`/product/${m.id}`}
                        onClick={() => setIsOpen(false)}
                        role="option"
                        aria-selected={isActive}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '10px 16px',
                          background: isActive ? 'var(--color-brand-subtle)' : 'transparent',
                          textDecoration: 'none',
                          borderLeft: `3px solid ${isActive ? 'var(--brand-cyan)' : 'transparent'}`,
                        }}
                      >
                        <div style={{ width: '40px', height: '40px', background: 'var(--grey-5)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: '4px', overflow: 'hidden' }}>
                          <ProductImage brand={m.brand} model={m.model} category={m.category} imageUrl={m.imageUrl} alt="" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 700, color: 'var(--black)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.brand} {m.model}
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)' }}>
                            {m.grade} · from £{m.price}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
                <div
                  style={{
                    padding: '10px 16px',
                    borderTop: '1px solid var(--grey-10)',
                    fontFamily: 'var(--font-body)', fontSize: '13px',
                    color: 'var(--grey-60)', cursor: 'pointer',
                  }}
                  onClick={() => submit()}
                >
                  See all results for <strong style={{ color: 'var(--black)' }}>"{searchQuery}"</strong>
                </div>
              </>
            )}

            {matches.length === 0 && searchQuery.trim().length > 0 && (
              <div style={{ padding: '16px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-60)' }}>
                <div style={{ fontWeight: 700, color: 'var(--black)', marginBottom: '4px' }}>
                  No matches for "{searchQuery.trim()}"
                </div>
                <div>
                  Try <button
                    type="button"
                    onClick={() => { setSearchQuery('iphone'); }}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand-cyan-hover)', cursor: 'pointer', textDecoration: 'underline' }}
                  >iPhone</button>{' or '}
                  <button
                    type="button"
                    onClick={() => { setSearchQuery('galaxy'); }}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand-cyan-hover)', cursor: 'pointer', textDecoration: 'underline' }}
                  >Galaxy</button>{', or '}
                  <button
                    type="button"
                    onClick={() => submit()}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand-cyan-hover)', cursor: 'pointer', textDecoration: 'underline' }}
                  >browse every device</button>.
                </div>
              </div>
            )}

            {matches.length === 0 && searchQuery.trim().length === 0 && recent.length === 0 && (
              <div style={{ padding: '16px', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-50)' }}>
                Start typing to see devices.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
