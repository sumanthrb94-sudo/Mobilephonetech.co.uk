import { motion } from 'motion/react';
import { CheckCircle2, Clock, Truck, Shield, AlertCircle } from 'lucide-react';

export default function WarrantyAndReturns() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            Warranty & Returns
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Shop with confidence. Our comprehensive warranty and hassle-free returns policy means you're always protected.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Warranty */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl p-12 border border-slate-100"
          >
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
              <Shield size={28} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-6">12-Month Warranty</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                <p className="text-slate-600 font-medium">Full manufacturer defects coverage</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                <p className="text-slate-600 font-medium">Battery replacement if health drops below 80%</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                <p className="text-slate-600 font-medium">Free repairs or replacement (at our discretion)</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                <p className="text-slate-600 font-medium">No questions asked within 12 months</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                <p className="text-slate-600 font-medium">Covers all hardware components</p>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-100">
              <p className="text-sm text-slate-500 font-medium">
                <span className="font-bold text-slate-900">Note:</span> Warranty does not cover physical damage from drops, water damage, or normal wear and tear beyond cosmetic condition.
              </p>
            </div>
          </motion.div>

          {/* Returns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-12 border border-slate-100"
          >
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
              <Truck size={28} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-6">30-Day Returns</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                <p className="text-slate-600 font-medium">Full refund within 30 days, no questions asked</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                <p className="text-slate-600 font-medium">Free return shipping label included</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                <p className="text-slate-600 font-medium">Refund processed within 5 business days</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                <p className="text-slate-600 font-medium">Device must be in original condition</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
                <p className="text-slate-600 font-medium">All original packaging and accessories required</p>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-slate-100">
              <p className="text-sm text-slate-500 font-medium">
                <span className="font-bold text-slate-900">Return Process:</span> Contact us, get a prepaid label, ship it back, and receive your refund.
              </p>
            </div>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-3xl p-12 border border-slate-100">
          <h3 className="text-3xl font-black text-slate-900 mb-8">Common Questions</h3>
          <div className="space-y-6">
            <div>
              <div className="flex gap-3 mb-3">
                <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
                <h4 className="font-black text-slate-900">What if my device has a defect?</h4>
              </div>
              <p className="text-slate-600 ml-8 font-medium">Contact our support team within 12 months and we'll arrange a repair or replacement at no cost. We'll even cover return shipping.</p>
            </div>
            <div>
              <div className="flex gap-3 mb-3">
                <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
                <h4 className="font-black text-slate-900">Can I return a device after 30 days?</h4>
              </div>
              <p className="text-slate-600 ml-8 font-medium">After 30 days, you're covered by our 12-month warranty for defects. If you're unhappy with the device itself (not a defect), returns are only available within the 30-day window.</p>
            </div>
            <div>
              <div className="flex gap-3 mb-3">
                <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
                <h4 className="font-black text-slate-900">Does the warranty cover accidental damage?</h4>
              </div>
              <p className="text-slate-600 ml-8 font-medium">No, our standard warranty covers manufacturing defects only. Accidental damage, water damage, and drops are not covered. However, we offer optional accidental damage protection at checkout.</p>
            </div>
            <div>
              <div className="flex gap-3 mb-3">
                <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
                <h4 className="font-black text-slate-900">What if the battery health drops below the guarantee?</h4>
              </div>
              <p className="text-slate-600 ml-8 font-medium">If battery health drops below the guaranteed percentage within 12 months, we'll replace the battery for free. This is covered under our warranty.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
