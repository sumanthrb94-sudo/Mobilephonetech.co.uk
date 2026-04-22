import { Truck, ShieldCheck, Battery, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

const TRUST_FEATURES = [
  {
    icon: ShieldCheck,
    title: '12-Month Warranty',
    desc: 'Full coverage for any technical defects, backed by our expert technicians.',
    color: 'text-blue-600'
  },
  {
    icon: Battery,
    title: '90%+ Battery Health',
    desc: 'We guarantee high-capacity batteries so your phone lasts all day.',
    color: 'text-emerald-600'
  },
  {
    icon: RefreshCw,
    title: '30-Day Returns',
    desc: 'Not happy? Return it for free within 30 days. No questions asked.',
    color: 'text-orange-600'
  },
  {
    icon: Truck,
    title: 'Free Next-Day Delivery',
    desc: 'Order by 4pm for free tracked delivery across the UK.',
    color: 'text-purple-600'
  }
];

export default function TrustSection() {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-24 lg:items-center">
          <div>
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-widest mb-6">
              Why Choose Us
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-slate-900 sm:text-5xl mb-8 leading-tight uppercase">
              The Gold Standard in <br />
              <span className="text-blue-600">Refurbished Tech.</span>
            </h2>
            <p className="text-lg text-slate-500 mb-12 font-medium leading-relaxed">
              We don't just sell used phones. We meticulously inspect, test, and certify every device to ensure it meets our "Like New" standard.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {TRUST_FEATURES.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4 group"
                >
                  <div className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 ${feature.color} shadow-sm group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tighter text-sm">{feature.title}</h3>
                    <p className="mt-1 text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          
          <div className="mt-16 lg:mt-0 relative">
            <div className="aspect-square rounded-[60px] overflow-hidden bg-slate-900 shadow-2xl relative z-10 p-1 group">
              <img 
                src="https://images.unsplash.com/photo-1556656793-062ff987b50d?q=80&w=1200&auto=format&fit=crop" 
                alt="Quality Inspection"
                className="h-full w-full object-cover rounded-[58px] opacity-80 transition-transform duration-1000 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-12">
                 <div>
                    <div className="text-4xl font-black text-white tracking-tighter mb-2">90-Point Check</div>
                    <div className="text-sm font-bold text-blue-400 uppercase tracking-widest">Every device certified</div>
                 </div>
              </div>
            </div>
            
            <div className="absolute -top-10 -right-10 h-40 w-40 bg-blue-600 rounded-full flex flex-col items-center justify-center text-white font-black p-4 text-center shadow-2xl z-20 border-8 border-white">
              <span className="text-[10px] uppercase tracking-widest text-blue-200">Rated</span>
              <span className="text-3xl">4.9/5</span>
              <span className="text-[10px] uppercase tracking-widest text-blue-200">On Trustpilot</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
