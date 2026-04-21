import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck, Zap, Globe, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-brand-bg pt-12 pb-20 lg:pt-24 lg:pb-32">
      {/* Revolutionary Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/5 blur-[150px] rounded-full" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12 lg:items-center">
          <div className="sm:text-center md:mx-auto md:max-w-2xl lg:col-span-12 lg:text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 rounded-full glass-card px-4 py-1 text-[10px] font-black leading-5 text-slate-900 tracking-[0.2em] uppercase mb-10 border-slate-200">
                <Globe className="h-3 w-3 text-blue-600" />
                Global Mobile Retailer
              </div>
              <h1 className="text-5xl font-black tracking-tighter text-brand-primary sm:text-7xl lg:text-8xl leading-[0.9] mb-10">
                EVERYTHING MOBILE. <br className="hidden lg:block" />
                <span className="text-blue-600 italic">FOR EVERY DEVICE.</span>
              </h1>
              <p className="mt-8 text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
                From the latest iPhones and MagSafe accessories to high-performance Mac Minis and expert-certified tech. A dedicated destination for the mobile ecosystem.
              </p>
              <div className="mt-14 flex flex-col sm:flex-row sm:justify-center gap-6">
                <button className="btn-primary flex items-center justify-center gap-3 px-10 py-5 text-xl tracking-tight shadow-2xl shadow-blue-600/20 active:scale-95 group">
                  Explore Collection
                  <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                </button>
                <button className="rounded-full border border-slate-200 bg-white/50 backdrop-blur-md px-10 py-5 text-xl font-bold text-slate-900 hover:bg-slate-50 transition-all active:scale-95">
                  Sell Your Tech
                </button>
              </div>
            </motion.div>
          </div>
          
          {/* Main Hero Card */}
          <div className="lg:col-span-12">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
              className="relative max-w-6xl mx-auto"
            >
              <div className="bg-white border border-slate-200 rounded-[60px] p-8 lg:p-16 relative overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.06)] flex flex-col lg:flex-row items-center gap-16 backdrop-blur-sm">
                <div className="flex-1 space-y-8 relative z-10 text-center lg:text-left">
                  <div className="inline-flex gap-2">
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Featured</span>
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Like New</span>
                  </div>
                  <h2 className="text-4xl lg:text-6xl font-black text-slate-900 leading-[0.95] tracking-tighter">
                    iPhone 15 Pro <br />
                    <span className="text-slate-400 font-medium text-3xl">Titanium Finish</span>
                  </h2>
                  <div className="flex items-baseline justify-center lg:justify-start gap-4">
                    <span className="text-5xl font-black text-slate-900">£649</span>
                    <span className="text-slate-400 line-through text-2xl font-bold italic">£999</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button className="bg-slate-900 text-white rounded-2xl px-8 py-5 font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all hover:scale-105 active:scale-95">Add to Bag</button>
                    <button 
                      onClick={() => document.getElementById('compare')?.scrollIntoView({ behavior: 'smooth' })}
                      className="bg-slate-50 text-slate-900 rounded-2xl px-8 py-5 font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all"
                    >
                      Compare AI Power
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 relative animate-float">
                  <div className="relative aspect-square max-w-md mx-auto">
                    <img
                      src="https://fdn2.gsmarena.com/vv/pics/apple/apple-iphone-15-pro-1.jpg"
                      alt="iPhone 15 Pro"
                      className="h-full w-full object-contain relative z-10 filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-blue-600/10 rounded-full blur-[100px] transform scale-90"></div>
                  </div>
                  {/* Floating Spec Tags */}
                  <div className="absolute -top-4 -right-4 glass-card p-4 rounded-2xl border-slate-200 shadow-xl hidden md:block">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AI Engine</p>
                     <p className="text-sm font-bold text-slate-900">35 TOPS NPU</p>
                  </div>
                </div>

                {/* Background Decor */}
                <div className="absolute left-0 top-0 w-full h-full pointer-events-none opacity-[0.03]">
                  <div className="grid grid-cols-12 h-full">
                     {Array.from({length: 12}).map((_, i) => (
                       <div key={i} className="border-r border-slate-900 h-full"></div>
                     ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
