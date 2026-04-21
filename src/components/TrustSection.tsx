import { Truck, ShieldCheck, Globe, Star } from 'lucide-react';
import { motion } from 'motion/react';

const STEPS = [
  {
    icon: Globe,
    title: 'Global Retail Infrastructure',
    desc: 'A robust logistics network, ensuring availability of mobile tech.',
    color: 'bg-blue-50 text-blue-600'
  },
  {
    icon: Truck,
    title: 'Mobile Shipping',
    desc: 'Next-day delivery across the nation, tracked and securely insured.',
    color: 'bg-green-50 text-green-600'
  },
  {
    icon: ShieldCheck,
    title: 'Standard Guarantee',
    desc: 'Manufacturer-backed warranties on new stock and certified checks on pre-owned.',
    color: 'bg-orange-50 text-orange-600'
  },
  {
    icon: Star,
    title: 'Expert Support Team',
    desc: '24/7 dedicated mobile experts ready to assist with any technical or buying query.',
    color: 'bg-purple-50 text-purple-600'
  }
];

export default function TrustSection() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-24 lg:items-center">
          <div>
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 sm:text-5xl mb-8 leading-tight italic uppercase">
              Professionals in <br />
              Mobile <span className="text-blue-600 underline underline-offset-8 decoration-4 decoration-blue-600/20">Retail.</span>
            </h2>
            <p className="text-lg text-slate-500 mb-12 font-medium leading-relaxed">
              We are a dedicated retail store for everything mobile. Whether it's a flagship, chargers, or wearables, we deliver with expertise.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {STEPS.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4"
                >
                  <div className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-blue-500 shadow-lg shadow-slate-900/10`}>
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tighter">{step.title}</h3>
                    <p className="mt-1 text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="mt-16 lg:mt-0 relative">
            <div className="aspect-video rounded-[60px] overflow-hidden bg-slate-900 shadow-[0_50px_100px_rgba(0,0,0,0.15)] relative z-10 p-1 group">
              <img 
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1200&auto=format&fit=crop" 
                alt="Global Mobile Logistics"
                className="h-full w-full object-cover rounded-[58px] opacity-60 transition-transform duration-1000 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="text-center">
                    <div className="text-5xl font-black text-white tracking-widest mb-2 italic">EST. 2026</div>
                    <div className="text-xs font-black text-blue-500 uppercase tracking-[0.4em]">Mobile Retailers</div>
                 </div>
              </div>
            </div>
            
            <div className="absolute -top-10 -right-10 h-48 w-48 bg-blue-600 rounded-full flex flex-col items-center justify-center text-white font-black p-4 text-center shadow-2xl z-20 border-8 border-white animate-pulse">
              <span className="text-[12px] uppercase tracking-widest text-blue-200">Serving</span>
              <span className="text-4xl">1M+</span>
              <span className="text-[12px] uppercase tracking-widest text-blue-200">Users</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
