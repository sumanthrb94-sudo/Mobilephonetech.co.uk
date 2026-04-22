import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ShoppingBag, Heart, User,
  LogOut, Package, HelpCircle, ShieldCheck, Menu, X, Laptop,
  Smartphone, Headphones, Watch, Tablet, Gamepad2, Tv, RefreshCw, BarChart3
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useSearch } from '../../context/SearchContext';
import { useAuth } from '../../context/AuthContext';
import AuthModal from '../AuthModal';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  onCartClick: () => void;
  onMenuClick?: () => void;
}

const CATEGORIES = [
  { label: 'Good deals',        href: '/products?deal=true',           icon: null },
  { label: 'Smartphones',       href: '/products?category=phones',     icon: Smartphone },
  { label: 'Laptops',           href: '/products?category=computing',  icon: Laptop },
  { label: 'Tablets',           href: '/products?category=tablets',    icon: Tablet },
  { label: 'Gaming consoles',   href: '/products?category=gaming',     icon: Gamepad2 },
  { label: 'Smartwatches',      href: '/products?category=watches',    icon: Watch },
  { label: 'Headphones',        href: '/products?category=accessories',icon: Headphones },
  { label: 'Smart TVs',         href: '/products?category=tv',         icon: Tv },
  { label: 'Trade-In',          href: '#trade-in',                     icon: RefreshCw },
  { label: 'Compare Devices',   href: '/compare',                      icon: BarChart3 },
];

export default function Navbar({ onCartClick }: NavbarProps) {
  const [isScrolled, setIsScrolled]               = useState(false);
  const [isMobileOpen, setIsMobileOpen]           = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen]     = useState(false);
  const [isAccountOpen, setIsAccountOpen]         = useState(false);
  const [searchFocused, setSearchFocused]         = useState(false);
  const [activeCategory, setActiveCategory]       = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const catNavRef   = useRef<HTMLDivElement>(null);

  const { cartCount }                 = useCart();
  const { searchQuery, setSearchQuery } = useSearch();
  const { user, logout, isAuthenticated } = useAuth();
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
    icon: Icon, label, onClick, badge, id, className = ""
  }: {
    icon: React.ElementType; label: string; onClick?: () => void; badge?: number; id?: string; className?: string;
  }) => (
    <button
      id={id}
      onClick={onClick}
      aria-label={label}
      className={`flex flex-col items-center gap-0.5 px-1 sm:px-2 py-1 rounded-lg group transition-colors hover:bg-[var(--grey-5)] ${className}`}
      style={{ minWidth: '40px', minHeight: '44px', cursor: 'pointer', border: 'none', background: 'transparent' }}
    >
      <div className="relative">
        <Icon size={20} style={{ color: 'var(--grey-70)', transition: 'color var(--duration-fast)' }}
          className="group-hover:text-[var(--black)]" />
        {badge !== undefined && badge > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full text-white font-bold"
            style={{ background: 'var(--blue-60)', fontSize: '9px', fontFamily: 'var(--font-sans)' }}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '10px',
          color: 'var(--grey-50)',
          lineHeight: 1,
        }}
        className="hidden lg:block group-hover:text-[var(--black)] transition-colors"
      >
        {label}
      </span>
    </button>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════════════
          FIXED HEADER — 64px — white, logo/search/icons
      ═══════════════════════════════════════════════════ */}
      <div
        className="fixed top-0 left-0 right-0 z-[60] bg-white"
        style={{
          borderBottom: '1px solid var(--grey-20)',
          boxShadow: isScrolled ? 'var(--shadow-sm)' : 'none',
          transition: 'box-shadow var(--duration-normal)',
        }}
      >
        {/* Main header row — 64px */}
        <header style={{ height: 'var(--header-h)' }}>
          <div
            className="container-bm h-full flex items-center gap-2 sm:gap-4 lg:gap-6"
            style={{ maxWidth: 'var(--container-max)' }}
          >
            {/* ── Mobile hamburger ── */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: '44px', height: '44px', border: 'none', background: 'transparent', cursor: 'pointer' }}
              aria-label="Open menu"
              id="navbar-hamburger"
            >
              <Menu size={22} style={{ color: 'var(--black)' }} />
            </button>

            {/* ── Logo — BM wordmark style ── */}
            <Link
              to="/"
              id="navbar-logo"
              className="flex-shrink-0 flex items-center gap-2 min-w-0"
              style={{ textDecoration: 'none' }}
            >
              <div
                className="flex-shrink-0"
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'var(--blue-60)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RefreshCw size={16} color="white" strokeWidth={2.5} />
              </div>
              <span
                className="truncate"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 900,
                  fontSize: '18px',
                  letterSpacing: '-0.04em',
                  color: 'var(--black)',
                  lineHeight: 1,
                }}
              >
                mobile<span style={{ color: 'var(--blue-60)' }}>tech</span>
                <span className="hidden sm:inline" style={{ color: 'var(--grey-40)', fontWeight: 400, fontSize: '14px' }}>.co.uk</span>
              </span>
            </Link>

            {/* ── Search bar — center, BM spec ── */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-grow max-w-xl relative"
              id="navbar-search-form"
            >
              <div className="relative w-full">
                <Search
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: searchFocused ? 'var(--black)' : 'var(--grey-40)',
                    transition: 'color var(--duration-fast)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  className="search-input w-full"
                  placeholder="Search for phones, brands, models…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  style={{ paddingLeft: '44px' }}
                  aria-label="Search products"
                />
              </div>
            </form>

            {/* ── Icon actions — right side ── */}
            <div className="flex items-center gap-0.5 sm:gap-1 ml-auto flex-shrink-0">
              {/* Quality/Trust */}
              <IconBtn icon={ShieldCheck} label="Quality" id="navbar-quality-btn" className="hidden xs:flex" />

              {/* Help */}
              <IconBtn icon={HelpCircle} label="Help" id="navbar-help-btn" className="hidden xs:flex" />

              {/* Account */}
              <div className="relative" ref={dropdownRef}>
                <IconBtn
                  icon={User}
                  label={isAuthenticated ? 'Account' : 'Sign in'}
                  id="navbar-account-btn"
                  onClick={() => isAuthenticated ? setIsAccountOpen(!isAccountOpen) : setIsAuthModalOpen(true)}
                />

                <AnimatePresence>
                  {isAccountOpen && isAuthenticated && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
                      className="absolute right-0 mt-2 w-60 bg-white rounded-xl overflow-hidden z-[70]"
                      style={{ border: '1px solid var(--grey-20)', boxShadow: 'var(--shadow-lg)', top: '100%' }}
                    >
                      <div
                        className="px-4 py-3"
                        style={{ borderBottom: '1px solid var(--grey-10)' }}
                      >
                        <p style={{ fontSize: '10px', fontFamily: 'var(--font-sans)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-50)', marginBottom: '2px' }}>
                          Signed in as
                        </p>
                        <p style={{ fontSize: '14px', fontFamily: 'var(--font-sans)', fontWeight: 600, color: 'var(--black)' }} className="truncate">
                          {user?.email}
                        </p>
                      </div>
                      <Link
                        to="/orders"
                        onClick={() => setIsAccountOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--grey-5)]"
                        style={{ fontSize: '14px', fontFamily: 'var(--font-body)', color: 'var(--grey-70)', textDecoration: 'none' }}
                      >
                        <Package size={16} /> My orders
                      </Link>
                      <button
                        onClick={() => { logout(); setIsAccountOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-red-50"
                        style={{ fontSize: '14px', fontFamily: 'var(--font-body)', color: '#dc2626', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                      >
                        <LogOut size={16} /> Sign out
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
                className="flex items-center gap-1 sm:gap-2 btn btn-primary btn-sm sm:btn-md ml-0.5 sm:ml-1 flex-shrink-0"
                aria-label={`Cart (${cartCount} items)`}
                style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, minWidth: 'fit-content' }}
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
              return cat.href.startsWith('#') ? (
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
                  mobiletech
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
                  cat.href.startsWith('#') ? (
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
