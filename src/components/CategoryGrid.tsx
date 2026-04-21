import { motion } from 'motion/react';

const CATEGORIES = [
  { id: '1', name: 'Flagships', count: '240+', image: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=800&auto=format&fit=crop' },
  { id: '2', name: 'Audio', count: '180+', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop' },
  { id: '3', name: 'Wearables', count: '120+', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop' },
  { id: '4', name: 'Cases & Protection', count: '1500+', image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop' },
  { id: '5', name: 'Power & Cables', count: '450+', image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=800&auto=format&fit=crop' },
  { id: '6', name: 'Tablets & Computing', count: '85+', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop' },
  { id: '7', name: 'Creators Hub', count: '65+', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop' },
  { id: '8', name: 'Enterprise Tech', count: '210+', image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=800&auto=format&fit=crop' },
];

export default function CategoryGrid() {
  return (
    <section className="py-24 bg-white border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2">Our Catalog</h2>
            <h3 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">Departments.</h3>
          </div>
          <button className="text-sm font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">View All Departments →</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {CATEGORIES.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
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
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">{cat.count} Units</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
