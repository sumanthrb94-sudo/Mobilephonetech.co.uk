import { motion } from 'motion/react';
import { ArrowRight, Smartphone, DollarSign, Zap } from 'lucide-react';

export default function TradeInProgram() {
  return (
    <section className="py-24 bg-slate-900 text-white" id="trade-in">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-2 rounded-full bg-blue-600/20 text-blue-400 text-sm font-bold mb-6 uppercase tracking-widest border border-blue-500/30">
              Trade-In Program
            </span>
            <h2 className="text-5xl lg:text-6xl font-black tracking-tighter mb-8 leading-[0.9]">
              Turn Your Old Device Into <span className="text-blue-400">Instant Cash</span>
            </h2>
            <p className="text-xl text-slate-300 mb-10 leading-relaxed font-medium">
              Ready for an upgrade? Get an expert valuation for your pre-owned device and receive same-day payment. It's the easiest way to offset your next purchase.
            </p>

            <div className="space-y-6 mb-12">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Smartphone className="text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="font-black text-lg mb-2">Free Valuation</h3>
                  <p className="text-slate-400">Get an instant quote for your device in seconds. No hidden fees.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <DollarSign className="text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="font-black text-lg mb-2">Same-Day Payment</h3>
                  <p className="text-slate-400">Accept our offer and get paid within 24 hours via bank transfer.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="font-black text-lg mb-2">Hassle-Free Process</h3>
                  <p className="text-slate-400">Free prepaid shipping label. We handle everything else.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <button className="px-8 py-4 bg-blue-600 text-white rounded-full font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-600/30">
                Get Free Quote <ArrowRight size={20} />
              </button>
              <button className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-full font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95">
                Learn More
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-gradient-to-br from-blue-600/20 to-slate-900 rounded-[3rem] p-12 border border-blue-500/20">
              <div className="space-y-8">
                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Example Valuations</span>
                    <span className="text-xs font-bold text-blue-400 uppercase">2024 Prices</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">iPhone 15 Pro Max</span>
                      <span className="text-blue-400 font-black text-lg">£650</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">iPhone 14 Pro</span>
                      <span className="text-blue-400 font-black text-lg">£450</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">iPhone 13</span>
                      <span className="text-blue-400 font-black text-lg">£280</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold">iPhone 12</span>
                      <span className="text-blue-400 font-black text-lg">£180</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-600/10 rounded-2xl p-6 border border-blue-500/30">
                  <p className="text-sm text-slate-300 font-medium">
                    <span className="text-blue-400 font-bold">💡 Pro Tip:</span> Trade in your old device when buying a new one and save even more. Combine trade-in credit with our already-low refurbished prices.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
