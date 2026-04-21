import { Search, ShoppingBag, User, Menu, CheckCircle2, ShieldCheck, Globe, Star } from 'lucide-react';
import { motion } from 'motion/react';

export default function Navbar() {
  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <button className="lg:hidden btn-icon">
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tighter text-blue-600">
                MOBILEWORLD<span className="text-slate-400">.com</span>
              </span>
            </div>
            <div className="hidden lg:flex gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <a href="#" className="text-blue-600 transition-colors">Phones</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Computing</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Accessories</a>
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
            <button className="btn-icon">
              <User className="h-5 w-5" />
            </button>
            <button className="relative btn-icon">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                0
              </span>
            </button>
          </div>
        </div>
        
        {/* Search for mobile */}
        <div className="px-4 pb-4 lg:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full rounded-full bg-slate-100 py-2 pl-10 pr-4 text-sm outline-none"
            />
          </div>
        </div>
      </nav>

      {/* Trust Bar */}
      <div className="bg-slate-900 text-white py-3 px-4 sm:px-8 border-b border-white/5">
        <div className="mx-auto max-w-7xl flex flex-wrap justify-between gap-4 text-[9px] font-black uppercase tracking-[0.2em] leading-none text-slate-400">
          <span className="flex items-center gap-1.5"><Globe className="h-3 w-3 text-blue-500" /> Global Logistics Network</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-blue-500" /> Manufacturer-Backed Warranties</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-blue-500" /> Next-Day Delivery</span>
          <span className="flex items-center gap-1.5 hidden md:flex"><Star className="h-3 w-3 text-blue-500" /> Dedicated Support</span>
        </div>
      </div>
    </>
  );
}
