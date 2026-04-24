import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, ArrowRight } from 'lucide-react';

/**
 * HomeFaq — reduces refurb skepticism right above the footer. Keeps
 * the most conversion-adjacent objections answered without sending
 * the visitor out to /faq. JSON-LD FAQPage schema is emitted too so
 * the answers can surface as rich results in Google.
 */

const FAQS = [
  {
    q: 'What does "refurbished" actually mean here?',
    a: 'Every device has been professionally inspected, tested across 30+ points, battery-verified, data-wiped, factory-reset, sanitised and re-packaged. If a unit fails any step it doesn\'t ship — we replace or refund.',
  },
  {
    q: 'How do your grades work — Pristine, Excellent, Good, Fair?',
    a: 'Pristine looks brand new with no marks. Excellent may have faint wear invisible from arm\'s length. Good may show minor marks on the frame or back but the screen is flawless. Fair may have visible wear but is functionally perfect. All grades come with the same warranty and return window.',
  },
  {
    q: 'How long is the warranty?',
    a: '12 months on every device, parts and labour, from the day you receive it. If it develops a fault we repair, replace or refund — your choice.',
  },
  {
    q: 'Can I return it if I change my mind?',
    a: 'Yes — 30 days, no questions asked, free return label. If the device is in the same condition you received it, we refund in full to your original payment method.',
  },
  {
    q: 'How fast is delivery?',
    a: 'Free next-day delivery on orders placed before 4 pm Monday–Friday, mainland UK. We ship tracked with DPD. Weekend and Northern Ireland orders arrive within 2 working days.',
  },
  {
    q: 'Are the phones unlocked?',
    a: 'Every phone we sell is fully SIM-unlocked and works with any UK or international network — no restrictions.',
  },
] as const;

export default function HomeFaq() {
  const [open, setOpen] = useState(0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <section
      aria-label="Frequently asked questions"
      style={{
        background: 'var(--grey-0)',
        paddingTop: 'var(--spacing-64)',
        paddingBottom: 'var(--spacing-64)',
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container-bm" style={{ maxWidth: '820px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-40)' }}>
          <div className="overline" style={{ marginBottom: '8px' }}>Questions? We got you</div>
          <h2
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(24px, 3vw, 34px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--brand-header)',
              lineHeight: 1.15,
              margin: '0 0 8px',
            }}
          >
            Buying refurbished, de-mystified.
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              color: 'var(--grey-60)',
              margin: 0,
            }}
          >
            The six questions every refurb buyer asks before clicking Add to cart.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={f.q}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--grey-10)',
                  background: isOpen ? 'var(--grey-5)' : 'var(--grey-0)',
                  overflow: 'hidden',
                  transition: 'background 0.2s',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '18px 20px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--black)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  <span style={{ flex: 1 }}>{f.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'inline-flex',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--color-brand-subtle)',
                      color: 'var(--brand-cyan-hover)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Plus size={16} strokeWidth={2.4} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <p
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '14px',
                          color: 'var(--grey-70)',
                          lineHeight: 1.65,
                          padding: '0 20px 20px',
                          margin: 0,
                        }}
                      >
                        {f.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: 'var(--spacing-32)' }}>
          <Link
            to="/faq"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--brand-cyan-hover)',
              textDecoration: 'none',
            }}
          >
            Full help centre <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
