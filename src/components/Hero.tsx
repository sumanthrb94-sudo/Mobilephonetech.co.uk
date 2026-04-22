import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck, Battery, RefreshCw } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-32 sm:pt-36 pb-16 overflow-hidden bg-slate-50 w-full">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[5%] w-[50%] h-[60%] bg-blue-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] -left-[5%] w-[40%] h-[50%] bg-indigo-50 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-bold mb-6 shadow-lg shadow-blue-600/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              PREMIUM UK REFURBISHED
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[0.9] mb-8 break-words">
              LIKE NEW. <br />
              <span className="text-blue-600 text-shadow-sm block">GUARANTEED.</span>
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 mb-10 max-w-lg leading-relaxed font-medium">
              Save up to £400 vs buying new. Every device is hand-tested, certified, and comes with a 12-month warranty. No surprises, just quality.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-12">
              <a 
                href="#products"
                className="px-6 sm:px-8 py-3 sm:py-4 bg-slate-900 text-white rounded-full font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-xl text-sm sm:text-base"
              >
                Shop iPhones <ArrowRight size={18} />
              </a>
              <a 
                href="#trade-in"
                className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-slate-900 border-2 border-slate-200 rounded-full font-bold hover:bg-slate-50 transition-all active:scale-95 text-sm sm:text-base text-center"
              >
                Sell Your Phone
              </a>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-6 sm:pt-8 border-t border-slate-200">
              <div className="flex flex-col gap-2">
                <div className="text-blue-600"><ShieldCheck size={20} /></div>
                <div className="text-xs sm:text-sm font-bold text-slate-900">12-Month Warranty</div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-blue-600"><Battery size={20} /></div>
                <div className="text-xs sm:text-sm font-bold text-slate-900">90%+ Battery Health</div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-blue-600"><RefreshCw size={20} /></div>
                <div className="text-xs sm:text-sm font-bold text-slate-900">30-Day Returns</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="relative z-10 bg-white p-2 sm:p-4 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-100">
              <div className="overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] bg-slate-50 aspect-[4/5] relative">
                <img 
                  src="/assets/YUYFZeFzWLMA.png" 
                  alt="iPhone 15 Pro Max"
                  className="w-full h-full object-contain p-8 drop-shadow-2xl"
                />
                <div className="absolute top-6 right-6 bg-white/90 backdrop-blur px-4 py-2 rounded-full font-bold text-slate-900 shadow-sm border border-slate-100">
                  Pristine Condition
                </div>
                <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 bg-slate-900/90 backdrop-blur p-4 sm:p-6 rounded-xl sm:rounded-2xl text-white border border-white/10">
                  <div className="flex justify-between items-end gap-2">
                    <div>
                      <div className="text-blue-400 text-[10px] sm:text-xs font-black mb-1 uppercase tracking-widest">Featured Deal</div>
                      <div className="text-lg sm:text-2xl font-black tracking-tight">iPhone 15 Pro Max</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 text-xs sm:text-sm line-through font-bold">£1,199</div>
                      <div className="text-2xl sm:text-3xl font-black text-blue-400">£849</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-slate-200 rounded-full opacity-50" />
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] border border-slate-200 rounded-full opacity-30" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
