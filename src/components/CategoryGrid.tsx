import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { MOCK_CATEGORIES } from '../data';

export default function CategoryGrid() {
  return (
    <section className="py-24 bg-slate-50" id="categories">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 text-xs font-black uppercase tracking-widest mb-4">
              Departments
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
              Shop by <span className="text-blue-600">Category.</span>
            </h2>
          </div>
          <a 
            href="/products" 
            className="group flex items-center gap-2 text-slate-900 font-black uppercase tracking-widest text-sm hover:text-blue-600 transition-colors"
          >
            View All Departments <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {MOCK_CATEGORIES.map((category, index) => (
            <motion.a
              key={category.id}
              href={`/products?category=${category.id}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative h-[400px] rounded-[2.5rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500"
            >
              <img
                src={category.imageUrl}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
              
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-blue-400 text-xs font-black uppercase tracking-widest mb-2">
                      {category.productCount}+ Models Available
                    </p>
                    <h3 className="text-3xl font-black text-white tracking-tight uppercase">
                      {category.name}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-lg">
                    <ArrowRight size={24} />
                  </div>
                </div>
              </div>
            </motion.a>
          ))}
          
          {/* Trade-in Card */}
          <motion.a
            href="#trade-in"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="group relative h-[400px] rounded-[2.5rem] overflow-hidden shadow-lg bg-blue-600 flex flex-col justify-center p-12 text-white"
          >
            <div className="relative z-10">
              <h3 className="text-4xl font-black tracking-tighter uppercase mb-4 leading-none">
                Sell Your <br />Old Phone.
              </h3>
              <p className="text-blue-100 font-medium mb-8 max-w-[200px]">
                Get an instant valuation and cash in your pocket today.
              </p>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-full font-black uppercase tracking-widest text-xs group-hover:scale-105 transition-transform">
                Get Started <ArrowRight size={16} />
              </div>
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-500 rounded-full opacity-50 blur-3xl group-hover:scale-125 transition-transform duration-700" />
          </motion.a>
        </div>
      </div>
    </section>
  );
}
