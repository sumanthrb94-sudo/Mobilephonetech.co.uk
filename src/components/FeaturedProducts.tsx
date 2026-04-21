import { MOCK_PHONES } from '../data';
import ProductCard from './ProductCard';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function FeaturedProducts() {
  return (
    <section className="py-24 bg-slate-50/50" id="products">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 px-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
              <Sparkles className="h-3 w-3" /> Premium Selection
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 sm:text-5xl">Latest Devices.</h2>
            <p className="mt-4 text-lg text-slate-500 font-medium italic">Explore our curated collection of top-tier smartphones with detailed specs.</p>
          </div>
          <button className="flex items-center gap-2 text-blue-600 font-bold hover:gap-3 transition-all uppercase tracking-widest text-xs">
            View All 10 Products <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {MOCK_PHONES.map((phone) => (
            <ProductCard key={phone.id} phone={phone} />
          ))}
        </div>
      </div>
    </section>
  );
}
