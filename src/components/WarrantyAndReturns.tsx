import { motion } from 'motion/react';
import { CheckCircle2, Truck, Shield, AlertCircle } from 'lucide-react';

/**
 * WarrantyAndReturns — Verified Form aesthetic refactor
 * Optimized for mobile: responsive padding, stacking grids.
 */

export default function WarrantyAndReturns() {
  return (
    <section className="py-16 md:py-24" style={{ background: 'var(--grey-5)' }}>
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-64)' }}>
          <div className="overline mb-4" style={{ justifyContent: 'center' }}>Hassle-Free Protection</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, color: 'var(--black)', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '20px' }}>
            Warranty & Returns
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '17px', color: 'var(--grey-50)', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
            Shop with total confidence. Our comprehensive protection and returns policy ensure your satisfaction is guaranteed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Warranty Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card card-xl"
            style={{ padding: 'clamp(24px, 5vw, 48px)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ width: '56px', height: '56px', background: 'var(--blue-10)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-60)', marginBottom: '24px' }}>
              <Shield size={28} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: '16px' }}>12-Month Warranty</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {[
                'Full manufacturer defects coverage',
                'Battery replacement if health drops below 80%',
                'Free repairs or replacement',
                'Covers all internal hardware components',
                'Dedicated UK support team'
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--trust-green)', flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--grey-10)' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-40)', margin: 0 }}>
                <span style={{ fontWeight: 700, color: 'var(--black)' }}>Note:</span> Coverage excludes accidental damage, liquid ingress, or unauthorised repairs.
              </p>
            </div>
          </motion.div>

          {/* Returns Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="card card-xl"
            style={{ padding: 'clamp(24px, 5vw, 48px)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ width: '56px', height: '56px', background: 'var(--green-10)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-60)', marginBottom: '24px' }}>
              <Truck size={28} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '24px', fontWeight: 800, color: 'var(--black)', marginBottom: '16px' }}>30-Day Returns</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
              {[
                'Full refund within 30 days',
                'Free return shipping label provided',
                'Simple, no-questions-asked process',
                'Refund processed in 3-5 business days',
                'Secure doorstep collection available'
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--trust-green)', flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--grey-60)', margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--grey-10)' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--grey-40)', margin: 0 }}>
                <span style={{ fontWeight: 700, color: 'var(--black)' }}>Process:</span> Simply initiate a return via your account or contact our help desk.
              </p>
            </div>
          </motion.div>
        </div>

        {/* FAQ Area */}
        <div className="card" style={{ padding: 'var(--spacing-32)', background: 'var(--grey-0)' }}>
          <h3 style={{ fontFamily: 'var(--font-sans)', fontSize: '20px', fontWeight: 800, color: 'var(--black)', marginBottom: '24px' }}>Common Questions</h3>
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-8">
            {[
              {
                q: "What if my device has a defect?",
                a: "Contact our support team within 12 months. We arrange repair or replacement at zero cost to you, including shipping."
              },
              {
                q: "Does the warranty cover the battery?",
                a: "Yes. If battery health falls below 80% within the first 12 months, we will replace the battery free of charge."
              },
              {
                q: "Can I return a device after 30 days?",
                a: "After 30 days, your purchase is covered by the 12-month defect warranty, but general returns are no longer possible."
              },
              {
                q: "Is accidental damage covered?",
                a: "Our standard warranty covers manufacturing defects. Accidental damage can be covered via our protection plans at checkout."
              }
            ].map((faq, i) => (
              <div key={i}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                  <AlertCircle size={16} style={{ color: 'var(--blue-60)' }} />
                  <h4 style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 700, color: 'var(--black)', margin: 0 }}>{faq.q}</h4>
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--grey-50)', lineHeight: 1.5, margin: 0, paddingLeft: '26px' }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
