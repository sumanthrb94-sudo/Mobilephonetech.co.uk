import { motion } from 'motion/react';

const CATEGORIES = [
  { id: 'phones', name: 'Smartphones', count: '10+ Models', image: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=800&auto=format&fit=crop' },
  { id: 'computing', name: 'Mac & Computing', count: 'Coming Soon', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop' },
  { id: 'accessories', name: 'Accessories', count: 'Coming Soon', image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop' },
  { id: 'audio', name: 'Audio & Sound', count: 'Coming Soon', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop' },
];

export default function CategoryGrid() {
  const handleCategoryClick = (id: string) => {
    if (id === 'phones') {
      const productsSection = document.getElementById('products');
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section className="py-24 bg-white border-b border-slate-100" id="categories">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2">Our Catalog</h2>
            <h3 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Departments.</h3>
          </div>
          <button 
            onClick={() => handleCategoryClick('phones')}
            className="text-sm font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
          >
            View All Departments →
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleCategoryClick(cat.id)}
              className="group relative h-64 overflow-hidden rounded-[32px] bg-slate-50 border border-slate-100 cursor-pointer shadow-sm hover:border-blue-600/30 transition-all hover:shadow-xl hover:-translate-y-1"
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:rotate-1 group-hover:scale-110 grayscale-20 group-hover:grayscale-0"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-80" />
              <div className="absolute bottom-6 left-6 text-white">
                <h3 className="font-black text-xl tracking-tight leading-none mb-1">{cat.name}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">{cat.count}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
