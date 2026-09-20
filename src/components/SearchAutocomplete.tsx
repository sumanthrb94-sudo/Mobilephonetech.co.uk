import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Clock, TrendingUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCatalogue } from '../context/CatalogueContext';
import type { Product } from '../types';
import { useSearch } from '../context/SearchContext';
import ProductImage from './ProductImage';

const RECENT_KEY = 'lehart:recent-searches';
const MAX_RECENT = 6;
const MAX_SUGGESTIONS = 6;

/**
 * A model name trimmed to the bit a person would actually type.
 *
 * Catalogue models carry retail tails — "Google Pixel 7 Pro - Unlocked",
 * "Playstation 5 Digital Edition Console (Disc Free)" — which in a narrow
 * dropdown truncate to "Google Pixel 7 ..." and "Sony Playstati...". A
 * suggestion you cannot read is not a suggestion.
 *
 * Cutting at the first " - " or " (" leaves a PREFIX of the model, and a
 * prefix is still a substring of it, so the term still matches the product
 * it came from under ProductsPage's substring filter. Collapsing an
 * immediately repeated word — some rows are literally "Nintendo Nintendo
 * Switch" in the data — leaves a substring too, for the same reason.
 *
 * Both of those are arguments, not guarantees, so e2e checks that every
 * suggestion on screen actually returns results.
 */
export function suggestionTerm(model: string): string {
  let term = model.split(' - ')[0].split(' (')[0].trim();
  term = term.replace(/\b(\w+)\s+\1\b/gi, '$1');
  return term;
}

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
 * - Debounced fuzzy match against the live catalogue
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
  const { products } = useCatalogue();
  const navigate = useNavigate();
  const { search: locationSearch } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>(() => (typeof window === 'undefined' ? [] : loadRecent()));
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Whether the URL carries a search the shopper actually committed to.
   *
   * This is the line between a DRAFT and a SEARCH, and the whole reason the
   * abandoned-text bug existed. searchQuery is a single useState in
   * SearchContext and the Navbar is the app shell, so it never unmounts:
   * type "Iph", think better of it, tap the page — and "Iph" sits in the bar
   * for the rest of the visit. Worse than untidy, because the same value
   * feeds ProductsPage's filter, so an abandoned three letters can quietly
   * narrow the shop to iPhones without anyone having searched for one.
   *
   * On /products?search=X the term IS committed: it is in the URL, it is
   * what the results are, and dismissing the dropdown must not wipe it. So
   * the draft is discarded only when there is no committed search behind it.
   */
  const hasCommittedSearch = new URLSearchParams(locationSearch).has('search');

  /**
   * Put the field back how it was found. Used when the panel is dismissed
   * without submitting — a tap outside, or Escape.
   */
  const abandonDraft = () => {
    setIsOpen(false);
    setActiveIndex(-1);
    if (!hasCommittedSearch) setSearchQuery('');
  };

  // Close on outside click, and drop whatever was half-typed with it.
  // Suggestions and Recent rows live inside containerRef, so choosing one is
  // never "outside" and never loses the term on the way to submitting it.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) abandonDraft();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
    // Re-registered when the committed search changes, so the handler is
    // never deciding with a stale answer to "is there a search behind this".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCommittedSearch]);

  const matches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) =>
      p.model.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q),
    ).slice(0, 6);
  }, [searchQuery, products]);

  /**
   * What to offer someone who has tapped the field and typed nothing.
   *
   * That visitor used to get nothing at all. There was an empty-state branch
   * below reading "Start typing to see devices", but showPanel required a
   * query or a saved search, so on a first visit the panel never opened and
   * that message could not render — a keyboard came up over a blank screen,
   * and the only way forward was to already know what we sell.
   *
   * Drawn from the live catalogue rather than hard-coded, so a suggestion is
   * always a device that exists and is in stock. Hard-coded names rot the
   * moment a line is discontinued, and a suggestion that returns no results
   * is worse than no suggestion.
   *
   * One per brand, dearest first. Dearest because the flagship is the name
   * people recognise and search for — "iPhone 15 Pro Max" is a better prompt
   * than whatever happens to sit first in the catalogue. One per brand
   * because six of the same make is a list that only helps a shopper who had
   * already decided.
   */
  const suggestions = useMemo<Product[]>(() => {
    const pool = products.filter((p) => p.stock > 0);
    const flagshipPerBrand = new Map<string, Product>();
    for (const p of (pool.length ? pool : products)) {
      const held = flagshipPerBrand.get(p.brand);
      if (!held || p.price > held.price) flagshipPerBrand.set(p.brand, p);
    }
    return [...flagshipPerBrand.values()]
      .sort((a, b) => b.price - a.price)
      .slice(0, MAX_SUGGESTIONS);
  }, [products]);

  // Opens on focus now, not only once there is something to match against.
  // suggestions is effectively never empty — the catalogue falls back to
  // MOCK_PHONES — but an empty panel is still worse than no panel, so the
  // condition asks rather than assumes.
  const showPanel = isOpen && (
    searchQuery.trim().length > 0 || recent.length > 0 || suggestions.length > 0
  );

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
      abandonDraft();
    }
  };

  /**
   * Get me out of search.
   *
   * Until this existed the only way out of an open panel was to delete the
   * query one character at a time, or to tap some part of the page the
   * dropdown was not already covering — on a phone, with the keyboard up,
   * that is most of it.
   *
   * One behaviour, not two: it always empties the field, closes the panel
   * and drops the keyboard. A button that clears on the first tap and
   * closes on the second is a button you have to experiment with.
   */
  const dismiss = () => {
    setSearchQuery('');
    setActiveIndex(-1);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const clearRecent = () => {
    setRecent([]);
    saveRecent([]);
  };

  return (
    // Visibility is the caller's job: the desktop navbar wraps this in
    // `hidden lg:block`, and the mobile search row shows it on demand. Owning a
    // `hidden md:flex` here made the component invisible inside the mobile row.
    <div ref={containerRef} className="flex flex-grow max-w-xl relative" role="search">
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
          ref={inputRef}
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
            paddingLeft: '44px',
            // Room for the clear button, but only when one is there — a
            // permanently indented field looks broken when it is empty.
            paddingRight: searchQuery.length > 0 ? '44px' : '16px',
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

        {/* Only once there is something to clear. An X on an empty field
            offers to undo nothing, and on this navbar it would sit a few
            pixels from the More menu at every width. */}
        {searchQuery.length > 0 && (
          <button
            type="button"
            onClick={dismiss}
            aria-label="Clear search"
            style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              width: '28px', height: '28px', borderRadius: 'var(--radius-full)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--grey-10)', border: 'none', cursor: 'pointer',
              color: 'var(--grey-60)', padding: 0,
            }}
          >
            <X size={15} />
          </button>
        )}
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

            {/* Popular searches — the answer to an empty field.
                Shown whenever nothing has been typed, under Recent if there
                is a Recent. Each row submits the search rather than opening
                the product: the shopper asked to search, so this fills in
                the words they did not know to type and lands them on results
                they can filter, not on one device chosen for them. It also
                writes to Recent, so the second visit is theirs. */}
            {matches.length === 0 && searchQuery.trim().length === 0 && suggestions.length > 0 && (
              <>
                <div style={{ padding: '10px 16px 6px', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-50)', borderTop: recent.length > 0 ? '1px solid var(--grey-10)' : undefined }}>
                  Popular searches
                </div>
                {suggestions.map((p) => {
                  /* The term is the model on its own, and that is load-bearing
                     rather than cosmetic. ProductsPage matches the query as a
                     substring of ONE field (see its filteredProducts: model,
                     brand, category, processor, display, features), so
                     "Apple iPhone 17 Pro Max" is in no single field and
                     returns nothing at all — the suggestion would hand the
                     shopper an empty results page, which is worse than
                     offering nothing. p.model always matches, because
                     p.model.includes(p.model).

                     It also stops the brand being said twice. Plenty of
                     models already carry it — "Samsung Galaxy Z Fold4",
                     "Nintendo Switch" — so prefixing the brand produced
                     "Nintendo Nintendo Switch". Where the model does not
                     carry it, the brand is shown beside it instead. */
                  /* Label and term are the same string, deliberately. An
                     earlier pass prefixed the brand when the model did not
                     carry it, so a row read "Apple iPhone 17 Pro Max" while
                     the search it ran was "iPhone 17 Pro Max" — the box then
                     filled with something other than what was tapped, and
                     Recent remembered a third thing. The brand cannot join
                     the term either: "Apple iPhone 17 Pro Max" is in no
                     single field and returns nothing. So the term stands
                     alone, which it can afford to — "iPhone 17 Pro Max" and
                     "Playstation 5" need no help being recognised. */
                  const term = suggestionTerm(p.model);
                  return (
                    <button
                      key={`s-${p.id}`}
                      type="button"
                      onClick={() => { setSearchQuery(term); submit(term); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        width: '100%', padding: '10px 16px', background: 'transparent', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                        fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-70)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--grey-5)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <TrendingUp size={14} style={{ color: 'var(--grey-40)', flexShrink: 0 }} />
                      {/* Wraps rather than truncating. At 390px the longer
                          names ended "...Mixed Reality Head..." — an
                          unreadable suggestion is no suggestion, and two
                          lines cost less than a name nobody can parse. */}
                      <span style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
                        {term}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
