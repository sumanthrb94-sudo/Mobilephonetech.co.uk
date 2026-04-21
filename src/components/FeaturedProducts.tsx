import { MOCK_PHONES } from '../data';
import ProductCard from './ProductCard';
import { ArrowRight } from 'lucide-react';

export default function FeaturedProducts() {
  return (
    <section className="py-24 bg-slate-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 px-4">
          <div>
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 sm:text-5xl">Hot Picks.</h2>
            <p className="mt-4 text-lg text-slate-500 font-medium italic">Trending across our global departments.</p>
          </div>
          <button className="flex items-center gap-2 text-blue-600 font-bold hover:gap-3 transition-all uppercase tracking-widest text-xs">
            Explore Full Catalog <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {MOCK_PHONES.slice(0, 4).map((phone) => (
            <ProductCard key={phone.id} phone={phone} />
          ))}
        </div>
      </div>
    </section>
  );
}
