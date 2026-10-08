import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';

type Testimonial = {
  quote: string;
  name: string;
  city: string;
  device: string;
  rating: number;
};

/**
 * Real, attributable customer quotes only. The four that shipped here were
 * placeholders written for the design — names, cities and one praising a
 * Pay-in-3 plan the shop does not offer — and presenting invented reviews as
 * genuine is prohibited under the DMCC Act 2024. The section renders nothing
 * until this holds at least one quote a customer actually gave, with consent.
 */
const DATA: Testimonial[] = [];

/**
 * TestimonialsSection — homepage social-proof carousel with 8s auto-rotate,
 * pausable on hover. Uses the existing .section-y rhythm + brand tokens.
 */
export default function TestimonialsSection() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = DATA.length;

  useEffect(() => {
    if (paused || total === 0) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % total), 8000);
    return () => clearTimeout(t);
  }, [index, paused, total]);

  if (total === 0) return null;
  const t = DATA[index];

  return (
    <section className="home-section-y" style={{ background: 'var(--grey-5)' }}>
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 'var(--spacing-32)' }}>
          <div className="overline mb-3">What customers say</div>
          <h2
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(26px, 3vw, 36px)',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--black)',
              lineHeight: 1.15,
            }}
          >
            Built on seven years of device expertise.
          </h2>
        </div>

        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            background: 'var(--grey-0)',
            border: '1px solid var(--grey-10)',
            borderRadius: 'var(--radius-xl)',
            padding: 'clamp(28px, 5vw, 48px)',
            position: 'relative',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Quote size={32} style={{ color: 'var(--brand-cyan)', opacity: 0.6 }} />

          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
            >
              <blockquote
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'clamp(18px, 2vw, 22px)',
                  lineHeight: 1.5,
                  color: 'var(--black)',
                  letterSpacing: '-0.01em',
                  fontWeight: 500,
                  margin: '16px 0 24px 0',
                }}
              >
                "{t.quote}"
              </blockquote>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div
                  aria-hidden
                  style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'var(--color-brand-subtle)', color: 'var(--brand-cyan-hover)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: '16px',
                  }}
                >
                  {t.name.split(' ').map((w) => w[0]).join('')}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, color: 'var(--black)', fontSize: '14px' }}>
                    {t.name} · {t.city}
                  </div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)' }}>
                    {t.device}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < t.rating ? 'var(--color-star)' : 'transparent'} style={{ color: 'var(--color-star)' }} />
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '28px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {DATA.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Show testimonial ${i + 1}`}
                  aria-current={i === index}
                  style={{
                    width: i === index ? '20px' : '8px',
                    height: '8px',
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    background: i === index ? 'var(--black)' : 'var(--grey-20)',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setIndex((i) => (i - 1 + total) % total)}
                aria-label="Previous testimonial"
                className="btn btn-secondary"
                style={{ width: '40px', height: '40px', padding: 0, borderRadius: 'var(--radius-full)' }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setIndex((i) => (i + 1) % total)}
                aria-label="Next testimonial"
                className="btn btn-secondary"
                style={{ width: '40px', height: '40px', padding: 0, borderRadius: 'var(--radius-full)' }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
