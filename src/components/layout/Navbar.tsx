import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ShoppingBag, Heart, User,
  HelpCircle, ShieldCheck, Menu, MoreHorizontal, X,
  Smartphone, Headphones, Watch, Tablet, Gamepad2, RefreshCw, Moon, Sun, Volume2
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useSearch } from '../../context/SearchContext';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import AuthModal from '../AuthModal';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  onCartClick: () => void;
  onMenuClick?: () => void;
}

const CATEGORIES = [
  { label: 'Home',              href: '/',                             icon: null },
  { label: 'Apple',             href: '/products?brand=Apple',         icon: Smartphone },
  { label: 'Samsung',           href: '/products?brand=Samsung',       icon: Smartphone },
  { label: 'Google',            href: '/products?brand=Google',        icon: Smartphone },
  { label: 'Ipads & Tabs',      href: '/products?category=tablets',    icon: Tablet },
  { label: 'Accessories',       href: '/products?category=Accessories',icon: Watch },
  { label: 'Speakers',          href: '/products?category=Speakers',   icon: Volume2 },
  { label: 'Hearables',         href: '/products?category=Hearables',  icon: Headphones },
  { label: 'Playables',         href: '/products?category=Playables',  icon: Gamepad2 },
  { label: 'Why us',            href: '/#why-us',                      icon: ShieldCheck },
];

export default function Navbar({ onCartClick }: NavbarProps) {
  const [isScrolled, setIsScrolled]               = useState(false);
  const [isMobileOpen, setIsMobileOpen]           = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen]     = useState(false);
  const [isAccountOpen, setIsAccountOpen]         = useState(false);

  const [activeCategory, setActiveCategory]       = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const catNavRef   = useRef<HTMLDivElement>(null);

  const { cartCount }                 = useCart();
  const { searchQuery, setSearchQuery } = useSearch();
  const { isAuthenticated } = useAuth();
  const { darkMode, toggleDarkMode } = useUI();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
  };

  const IconBtn = ({
    icon: Icon, label, onClick, badge, id
  }: {
    icon: React.ElementType; label: string; onClick?: () => void; badge?: number; id?: string;
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
    <button
      id={id}
      onClick={onClick}
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        padding: '4px 4px',
        borderRadius: '8px',
        cursor: 'pointer',
        border: 'none',
        backgroundColor: isHovered ? 'rgba(255,255,255,0.1)' : 'transparent',
        transition: 'background-color 0.2s',
        width: '40px',
        height: '40px',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ position: 'relative' }}>
        <Icon size={22} style={{ color: 'var(--grey-0)' }} />
        {badge !== undefined && badge > 0 && (
          <span
            style={{ 
              position: 'absolute', 
              top: '-6px', 
              right: '-6px', 
              width: '18px', 
              height: '18px', 
              borderRadius: '50%', 
              background: 'var(--brand-cyan)', 
              color: 'var(--grey-0)',
              fontSize: '10px', 
              fontFamily: 'var(--font-sans)',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span
        className="hidden sm:inline"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '10px',
          color: 'rgba(255,255,255,0.75)',
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </button>
  );
};

  return (
    <>
      {/* ═══════════════════════════════════════════════════
          ANNOUNCEMENT BAR & FIXED HEADER
      ═══════════════════════════════════════════════════ */}
      <div
        className="fixed top-0 left-0 right-0 z-[60]"
        style={{
          backgroundColor: 'var(--brand-header)',
          boxShadow: isScrolled ? 'var(--shadow-md)' : 'none',
          transition: 'box-shadow var(--duration-normal)',
        }}
      >
        {/* Announcement Bar */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.2)',
          color: 'var(--grey-0)',
          textAlign: 'center',
          padding: '6px 16px',
          fontFamily: 'var(--font-sans)',
          fontSize: '12px',
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}>
          Free next-day delivery · 12-month warranty · 30-day free returns
        </div>
        {/* Main header row — 64px */}
        <header style={{ height: 'var(--header-h)', display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: '100%',
              maxWidth: '1280px',
              marginLeft: 'auto',
              marginRight: 'auto',
              display: 'flex',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
            className="navbar-header"
          >
            {/* ── Mobile hamburger ── */}
            <button
              onClick={() => setIsMobileOpen(true)}
              style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
              aria-label="Open menu"
              id="navbar-hamburger"
              className="lg:hidden"
            >
              <Menu size={22} style={{ color: 'var(--grey-0)' }} />
            </button>

            {/* ── Logo — BM wordmark style ── */}
            <Link
              to="/"
              id="navbar-logo"
              className="navbar-logo flex-shrink-0 flex items-center min-w-0"
              style={{ textDecoration: 'none' }}
            >
              <span className="navbar-logo-tile flex-shrink-0">
                <RefreshCw className="navbar-logo-icon" color="white" strokeWidth={2.5} />
              </span>
              <span
                className="navbar-logo-wordmark truncate"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 900,
                  letterSpacing: '-0.04em',
                  color: 'var(--brand-cyan)',
                  lineHeight: 1,
                }}
              >
                mobile<span style={{ color: 'var(--grey-0)' }}>tech</span>
                <span className="hidden sm:inline" style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 400, fontSize: '14px' }}>.co.uk</span>
              </span>
            </Link>

            {/* ── Search bar — center, BM spec ── */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-grow max-w-xl relative"
              id="navbar-search-form"
            >
                <Search
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--grey-50)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  className="w-full"
                  placeholder="Search iPhone, Galaxy, Pixel…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    paddingLeft: '44px',
                    paddingRight: '16px',
                    height: '40px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--grey-0)',
                    border: '1px solid transparent',
                    color: 'var(--black)',
                    fontFamily: 'var(--font-body)',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'box-shadow var(--duration-fast) var(--ease-default)',
                  }}
                  onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.boxShadow = '0 0 0 3px var(--color-brand-subtle)'; }}
                  onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.boxShadow = 'none'; }}
                  aria-label="Search products"
                />
              </form>

            {/* ── Icon actions — right side ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: 'auto', flexShrink: 0 }}>
              {/* Profile Menu Dropdown */}
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  id="navbar-menu-btn"
                  onClick={() => setIsAccountOpen(!isAccountOpen)}
                  aria-label="More options"
                  aria-haspopup="menu"
                  aria-expanded={isAccountOpen}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: 'transparent',
                    width: '40px',
                    height: '40px',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <MoreHorizontal size={22} style={{ color: 'var(--grey-0)' }} />
                  </div>
                  <span className="hidden sm:inline" style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'rgba(255,255,255,0.75)', lineHeight: 1 }}>
                    More
                  </span>
                </button>

                <AnimatePresence>
                  {isAccountOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                      style={{ 
                        position: 'absolute', 
                        right: 0, 
                        top: '100%',
                        marginTop: '8px',
                        width: '220px',
                        background: 'var(--grey-0)', 
                        borderRadius: '12px',
                        border: '1px solid var(--grey-20)', 
                        boxShadow: 'var(--shadow-lg)',
                        overflow: 'hidden',
                        zIndex: 70 
                      }}
                    >
                      <button
                        onClick={() => setIsAccountOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          width: '100%', padding: '12px 16px',
                          background: 'transparent', border: 'none',
                          cursor: 'pointer', textAlign: 'left'
                        }}
                      >
                        <ShieldCheck size={18} style={{ color: 'var(--brand-cyan-hover)' }} />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-70)' }}>
                          Quality Guarantee
                        </span>
                      </button>

                      <button
                        onClick={() => setIsAccountOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          width: '100%', padding: '12px 16px',
                          background: 'transparent', border: 'none',
                          cursor: 'pointer', textAlign: 'left',
                          borderTop: '1px solid var(--grey-10)'
                        }}
                      >
                        <HelpCircle size={18} style={{ color: 'var(--grey-50)' }} />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-70)' }}>
                          Help & Support
                        </span>
                      </button>

                      <button
                        onClick={() => { toggleDarkMode(); setIsAccountOpen(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          width: '100%', padding: '12px 16px',
                          background: 'transparent', border: 'none',
                          cursor: 'pointer', textAlign: 'left',
                          borderTop: '1px solid var(--grey-10)'
                        }}
                      >
                        {darkMode ? (
                          <Sun size={18} style={{ color: 'var(--grey-50)' }} />
                        ) : (
                          <Moon size={18} style={{ color: 'var(--grey-50)' }} />
                        )}
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-70)' }}>
                          {darkMode ? 'Light Mode' : 'Dark Mode'}
                        </span>
                      </button>

                      <button
                        onClick={() => setIsAuthModalOpen(true)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          width: '100%', padding: '12px 16px',
                          background: 'transparent', border: 'none',
                          cursor: 'pointer', textAlign: 'left',
                          borderTop: '1px solid var(--grey-10)'
                        }}
                      >
                        <User size={18} style={{ color: 'var(--grey-50)' }} />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-70)' }}>
                          {isAuthenticated ? 'My Account' : 'Sign In'}
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Wishlist */}
              <Link to="/wishlist" id="navbar-wishlist-btn" style={{ textDecoration: 'none' }}>
                <IconBtn icon={Heart} label="Wishlist" />
              </Link>

              {/* Cart */}
              <button
                id="navbar-cart-btn"
                onClick={onCartClick}
                className="navbar-cart"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: 'var(--brand-cyan)',
                  color: 'var(--grey-0)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 700,
                  fontSize: '14px',
                  transition: 'background-color var(--duration-fast) var(--ease-default)',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--brand-cyan-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--brand-cyan)'; }}
                aria-label={`Cart (${cartCount} items)`}
              >
                <ShoppingBag size={18} />
                <span>{cartCount}</span>
              </button>
            </div>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════
            CATEGORY NAV BAR — 48px — horizontal scroll
        ═══════════════════════════════════════════════════ */}
        <nav
          aria-label="Product categories"
          style={{
            height: 'var(--catnav-h)',
            borderTop: '1px solid var(--grey-10)',
            background: 'var(--grey-0)',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
          ref={catNavRef}
          className="no-scrollbar"
        >
          <div
            className="container-bm h-full flex items-center gap-1 px-4"
            style={{ maxWidth: 'var(--container-max)', minWidth: 'max-content' }}
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.label;
              return cat.href.includes('#') ? (
                <a
                  key={cat.label}
                  href={cat.href}
                  id={`catnav-${cat.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setActiveCategory(cat.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 12px',
                    borderBottom: isActive ? '2px solid var(--black)' : '2px solid transparent',
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--black)' : 'var(--grey-60)',
                    background: 'transparent',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    transition: 'all var(--duration-fast)',
                    height: '100%',
                  }}
                >
                  {cat.label}
                </a>
              ) : (
                <Link
                  key={cat.label}
                  to={cat.href}
                  id={`catnav-${cat.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => setActiveCategory(cat.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 12px',
                    height: '100%',
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--black)' : 'var(--grey-60)',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    borderBottom: isActive ? '2px solid var(--black)' : '2px solid transparent',
                    borderRadius: 0,
                    transition: 'all var(--duration-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = 'var(--black)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = 'var(--grey-60)';
                  }}
                >
                  {cat.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* ═══════════════════════════════════════════════════
          MOBILE FULL-SCREEN MENU
      ═══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 z-[90]"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed left-0 top-0 bottom-0 z-[100] bg-white flex flex-col overflow-y-auto"
              style={{ width: 'min(320px, 85vw)' }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid var(--grey-10)', height: '64px' }}
              >
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 900, fontSize: '18px', letterSpacing: '-0.04em', color: 'var(--black)' }}>
                  mobile<span style={{ color: 'var(--brand-cyan)' }}>tech</span>
                  <span style={{ color: 'var(--grey-40)', fontWeight: 400, fontSize: '13px' }}>.co.uk</span>
                </span>
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center justify-center rounded-full"
                  style={{ width: '36px', height: '36px', background: 'var(--grey-5)', border: 'none', cursor: 'pointer' }}
                  aria-label="Close menu"
                >
                  <X size={18} style={{ color: 'var(--grey-70)' }} />
                </button>
              </div>

              {/* Mobile search */}
              <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--grey-10)' }}>
                <form onSubmit={handleSearch} className="relative">
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--grey-40)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    className="search-input w-full"
                    placeholder="Search products…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                  />
                </form>
              </div>

              {/* Nav links */}
              <div className="flex-grow py-2">
                {CATEGORIES.map((cat) => (
                  cat.href.includes('#') ? (
                    <a
                      key={cat.label}
                      href={cat.href}
                      onClick={() => setIsMobileOpen(false)}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--grey-5)]"
                      style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 500, color: 'var(--grey-80)', textDecoration: 'none' }}
                    >
                      {cat.icon && <cat.icon size={18} style={{ color: 'var(--grey-40)' }} />}
                      {cat.label}
                    </a>
                  ) : (
                    <Link
                      key={cat.label}
                      to={cat.href}
                      onClick={() => setIsMobileOpen(false)}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--grey-5)]"
                      style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 500, color: 'var(--grey-80)', textDecoration: 'none' }}
                    >
                      {cat.icon && <cat.icon size={18} style={{ color: 'var(--grey-40)' }} />}
                      {cat.label}
                    </Link>
                  )
                ))}
              </div>

              {/* Auth */}
              <div className="p-4" style={{ borderTop: '1px solid var(--grey-10)' }}>
                <button
                  onClick={() => { setIsMobileOpen(false); setIsAuthModalOpen(true); }}
                  className="btn btn-primary btn-md btn-full"
                  id="mobile-menu-auth-btn"
                >
                  {isAuthenticated ? 'My Account' : 'Sign in / Register'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
