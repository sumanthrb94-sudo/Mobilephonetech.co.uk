import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Hero from './components/Hero';
import FeaturedProducts from './components/FeaturedProducts';
import CategoryGrid from './components/CategoryGrid';
import TrustSection from './components/TrustSection';
import ComparisonTool from './components/ComparisonTool';
import AIAssistant from './components/AIAssistant';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-bg relative">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <CategoryGrid />
        <FeaturedProducts />
        <ComparisonTool />
        <TrustSection />
        
        {/* Why Sell With Us Banner */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[40px] bg-slate-900 p-12 lg:p-20 shadow-2xl">
              <div className="relative z-10 lg:max-w-2xl">
                <span className="text-blue-500 font-bold uppercase tracking-widest text-xs mb-4 block">Trade-In Program</span>
                <h2 className="text-4xl font-black tracking-tighter text-white sm:text-6xl leading-[0.95]">
                  TURN YOUR OLD DEVICE INTO <span className="text-blue-500">INSTANT CASH.</span>
                </h2>
                <p className="mt-8 text-xl text-slate-400 font-medium leading-relaxed">
                  Ready for an upgrade? Expert valuation and same-day payment for your pre-owned devices.
                </p>
                <div className="mt-12 flex flex-wrap gap-4">
                  <button className="rounded-full bg-blue-600 px-10 py-5 text-lg font-bold text-white transition-all hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-xl shadow-blue-600/20">
                    Get Free Quote
                  </button>
                  <button className="rounded-full border border-slate-700 bg-white/5 px-10 py-5 text-lg font-bold text-white transition-all hover:bg-white/10 active:scale-95 tracking-wide">
                    Learn More
                  </button>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-blue-600/20 to-transparent"></div>
              <div className="absolute -right-20 -top-20 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]"></div>
              <div className="absolute bottom-0 right-0 h-full w-1/3 opacity-10 pointer-events-none overflow-hidden">
                 <svg className="w-full h-full transform translate-x-20 translate-y-20 lg:translate-x-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zM17 17H7V4h10v13z"/></svg>
              </div>
            </div>
          </div>
        </section>
      </main>

      <AIAssistant />
      <Footer />
    </div>
  );
}
