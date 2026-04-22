import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Search, 
  Menu, 
  X, 
  Heart, 
  User, 
  ChevronDown,
  ShieldCheck,
  Truck,
  RefreshCw,
  LogOut,
  Package
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useSearch } from '../../context/SearchContext';
import { useAuth } from '../../context/AuthContext';
import AuthModal from '../AuthModal';
import MegaMenu from '../MegaMenu';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  onCartClick: () => void;
}

export default function Navbar({ onCartClick }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  
  const { cartCount } = useCart();
  const { searchQuery, setSearchQuery } = useSearch();
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navLinks = [
    { name: 'Phones', href: '/products' },
    { name: 'Categories', href: '#categories', isMega: true },
    { name: 'Compare', href: '#compare' },
    { name: 'Trade-In', href: '#trade-in' },
  ];

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[60] transition-all duration-300">
        {/* Trust Bar */}
        <div className={`bg-slate-900 text-white transition-all duration-300 overflow-hidden ${
          isScrolled ? 'max-h-0 py-0 opacity-0' : 'py-1.5'
        }`}>
          <div className="max-w-7xl mx-auto flex justify-center md:justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
            <div className="hidden md:flex items-center gap-6">
              <span className="flex items-center gap-2"><ShieldCheck size={12} className="text-blue-400" /> 12-Month Warranty</span>
              <span className="flex items-center gap-2"><Truck size={12} className="text-blue-400" /> Free Next-Day Delivery</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2"><RefreshCw size={12} className="text-blue-400" /> 30-Day Returns</span>
              <span className="hidden sm:inline">Rated 4.9/5 on Trustpilot</span>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <nav className={`transition-all duration-300 ${
          isScrolled ? 'bg-white/90 backdrop-blur-md shadow-lg py-2' : 'bg-white py-2.5'
        }`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center gap-8">
              {/* Logo */}
              <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
                <div className="w-8 sm:w-9 h-8 sm:h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
                  <RefreshCw size={18} className="font-black" />
                </div>
                <span className="text-lg sm:text-xl font-black tracking-tighter text-slate-900 uppercase">
                  Mobile<span className="text-blue-600">Tech</span>
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-8">
                {navLinks.map((link) => (
                  <div 
                    key={link.name}
                    onMouseEnter={() => link.isMega && setIsMegaMenuOpen(true)}
                    onMouseLeave={() => link.isMega && setIsMegaMenuOpen(false)}
                    className="relative"
                  >
                    {link.href.startsWith('#') ? (
                      <a
                        href={link.href}
                        className="text-sm font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1"
                      >
                        {link.name}
                        {link.isMega && <ChevronDown size={14} />}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-sm font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1"
                      >
                        {link.name}
                        {link.isMega && <ChevronDown size={14} />}
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="hidden md:flex flex-grow max-w-md relative group">
                <input
                  type="text"
                  placeholder="Search iPhones, Samsung..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600/20 focus:bg-white rounded-full py-2.5 pl-12 pr-4 text-sm font-medium transition-all outline-none"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
              </form>

              {/* Actions */}
              <div className="flex items-center gap-1 sm:gap-3">
                <Link to="/wishlist" className="p-2 text-slate-600 hover:text-blue-600 transition-colors relative" data-testid="wishlist-link">
                  <Heart size={20} />
                </Link>

                <div className="relative">
                  <button 
                    onClick={() => isAuthenticated ? setIsAccountDropdownOpen(!isAccountDropdownOpen) : setIsAuthModalOpen(true)}
                    className="p-2 text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1"
                    data-testid="account-button"
                  >
                    <User size={20} />
                    {isAuthenticated && <ChevronDown size={14} />}
                  </button>

                  <AnimatePresence>
                    {isAccountDropdownOpen && isAuthenticated && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-4 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-[70]"
                      >
                        <div className="px-4 py-3 border-b border-slate-50">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Logged in as</p>
                          <p className="text-sm font-bold text-slate-900 truncate">{user?.email}</p>
                        </div>
                        <Link to="/orders" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                          <Package size={18} /> My Orders
                        </Link>
                        <button 
                          onClick={() => {
                            logout();
                            setIsAccountDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut size={18} /> Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button 
                  onClick={onCartClick}
                  className="flex items-center gap-2 bg-slate-900 text-white px-3 sm:px-4 py-2 rounded-full hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                  data-testid="cart-button"
                >
                  <ShoppingBag size={18} />
                  <span className="text-sm font-black">{cartCount}</span>
                </button>

                <button 
                  className="lg:hidden p-2 text-slate-900"
                  onClick={() => setIsMobileMenuOpen(true)}
                  data-testid="mobile-menu-button"
                >
                  <Menu size={22} />
                </button>
              </div>
            </div>
          </div>

          {/* Mega Menu */}
          <MegaMenu isOpen={isMegaMenuOpen} onClose={() => setIsMegaMenuOpen(false)} />
        </nav>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col"
          >
            <div className="p-6 flex justify-between items-center border-b border-slate-100">
              <span className="text-xl font-black tracking-tighter uppercase">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-full">
                <X size={24} />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-6 space-y-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-3xl font-black uppercase tracking-tighter text-slate-900 hover:text-blue-600 transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="p-6 bg-slate-50">
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-sm"
              >
                {isAuthenticated ? 'My Account' : 'Login / Register'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
