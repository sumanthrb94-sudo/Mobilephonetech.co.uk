import { Facebook, Twitter, Instagram, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16 px-4">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Link to="/" className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tighter text-blue-600">
                  MOBILEWORLD<span className="text-slate-400">.com</span>
                </span>
              </Link>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              A global store for certified technology and accessories. Trusted by over 1.2M customers.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-blue-600 hover:text-white transition-all">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-blue-600 hover:text-white transition-all">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 hover:bg-blue-600 hover:text-white transition-all">
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-lg mb-6">Categories</h4>
            <ul className="space-y-4 text-slate-500 text-sm font-medium">
              <li><Link to="/#products" className="hover:text-blue-600 transition-colors">Refurbished iPhones</Link></li>
              <li><Link to="/#products" className="hover:text-blue-600 transition-colors">Samsung Galaxy</Link></li>
              <li><Link to="/#products" className="hover:text-blue-600 transition-colors">Google Pixel</Link></li>
              <li><Link to="/#products" className="hover:text-blue-600 transition-colors">Sell Your Phone</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-lg mb-6">Company</h4>
            <ul className="space-y-4 text-slate-500 text-sm font-medium">
              <li><a href="#" className="hover:text-blue-600 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">Expert Grading Guide</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">Help & Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-lg mb-6">Stay Updated</h4>
            <div className="relative">
              <input 
                type="email" 
                placeholder="Email address" 
                className="w-full bg-slate-100 border-none rounded-full py-3 px-6 text-sm outline-none focus:ring-2 focus:ring-blue-600/20 transition-all"
              />
              <button className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full bg-slate-900 text-white hover:bg-blue-600 transition-colors">
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
          <p>© 2026 MOBILEWORLD.COM — TRUSTED BY 1.2M CUSTOMERS</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Grading Guide</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
