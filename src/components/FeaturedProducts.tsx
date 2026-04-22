import { MOCK_PHONES } from '../data';
import ProductCard from './ProductCard';
import { ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function FeaturedProducts() {
  return (
    <section className="py-24 bg-white" id="products">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 px-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
              <Sparkles className="h-3 w-3" /> Premium Selection
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 sm:text-5xl uppercase">Latest <span className="text-blue-600">Devices.</span></h2>
            <p className="mt-4 text-lg text-slate-500 font-medium max-w-xl">Hand-picked iPhones in pristine and excellent condition. Every device is fully tested and ready for its next owner.</p>
          </div>
          <a 
            href="/products"
            className="flex items-center gap-2 text-slate-900 font-black hover:text-blue-600 transition-all uppercase tracking-widest text-xs group"
          >
            View All {MOCK_PHONES.length} Products <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {MOCK_PHONES.map((phone, index) => (
            <motion.div
              key={phone.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <ProductCard phone={phone} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
