import { Search, ShoppingBag, User, Menu, CheckCircle2, ShieldCheck, Globe, Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../../context/CartContext';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
  onCartClick?: () => void;
}

export default function Navbar({ onCartClick }: NavbarProps) {
  const { cartCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  const navLinks = [
    { name: 'Phones', href: isHome ? '#products' : '/#products' },
    { name: 'Categories', href: isHome ? '#categories' : '/#categories' },
    { name: 'Compare', href: isHome ? '#compare' : '/#compare' },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tighter text-blue-600">
                MOBILEWORLD<span className="text-slate-400">.com</span>
              </span>
            </Link>
            <div className="hidden lg:flex gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
              {navLinks.map((link) => (
                link.href.startsWith('#') ? (
                  <a key={link.name} href={link.href} className="hover:text-blue-600 transition-colors">{link.name}</a>
                ) : (
                  <Link key={link.name} to={link.href} className="hover:text-blue-600 transition-colors">{link.name}</Link>
                )
              ))}
            </div>
          </div>

          <div className="hidden flex-1 px-12 lg:block max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search across departments..."
                className="w-full rounded-[14px] bg-slate-100 py-3 pl-10 pr-4 text-sm font-bold outline-none transition-all focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors hidden sm:block">
              <User className="h-5 w-5 text-slate-600" />
            </button>
            <motion.button 
              onClick={onCartClick}
              className="relative p-2 hover:bg-slate-100 rounded-full transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <ShoppingBag className="h-5 w-5 text-slate-600" />
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-[9px] rounded-full w-5 h-5 flex items-center justify-center font-black border-2 border-white"
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-slate-100 bg-white px-4 py-4 overflow-hidden"
            >
              <div className="space-y-1">
                {navLinks.map((link) => (
                  link.href.startsWith('#') ? (
                    <a 
                      key={link.name} 
                      href={link.href} 
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 py-3 rounded-xl hover:bg-slate-50 text-sm font-bold text-slate-900 transition-colors"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <Link 
                      key={link.name} 
                      to={link.href} 
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 py-3 rounded-xl hover:bg-slate-50 text-sm font-bold text-slate-900 transition-colors"
                    >
                      {link.name}
                    </Link>
                  )
                ))}
              </div>
              <div className="mt-4 px-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full rounded-xl bg-slate-100 py-3 pl-10 pr-4 text-sm font-bold outline-none"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Trust Bar */}
      <div className="bg-slate-900 text-white py-3 px-4 sm:px-8 border-b border-white/5 overflow-hidden">
        <div className="mx-auto max-w-7xl flex flex-nowrap md:flex-wrap justify-start md:justify-between gap-6 md:gap-4 text-[9px] font-black uppercase tracking-[0.2em] leading-none text-slate-400 whitespace-nowrap overflow-x-auto no-scrollbar">
          <span className="flex items-center gap-1.5 shrink-0"><Globe className="h-3 w-3 text-blue-500" /> Global Logistics Network</span>
          <span className="flex items-center gap-1.5 shrink-0"><ShieldCheck className="h-3 w-3 text-blue-500" /> Manufacturer-Backed Warranties</span>
          <span className="flex items-center gap-1.5 shrink-0"><CheckCircle2 className="h-3 w-3 text-blue-500" /> Next-Day Delivery</span>
          <span className="flex items-center gap-1.5 shrink-0"><Star className="h-3 w-3 text-blue-500" /> Dedicated Support</span>
        </div>
      </div>
    </>
  );
}
