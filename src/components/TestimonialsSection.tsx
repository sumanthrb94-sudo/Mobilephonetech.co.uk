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

const DATA: Testimonial[] = [
  {
    quote: "Bought a refurbished iPhone 14 Pro — honestly looks brand new. Delivery was next day and the battery's been spot on for 3 months.",
    name: 'Priya K.',
    city: 'Manchester',
    device: 'iPhone 14 Pro · Pristine',
    rating: 5,
  },
  {
    quote: "I was nervous about going refurbished but the grading page sold me. Got a Galaxy S24 Ultra for half the price of new. Zero regrets.",
    name: 'Tom W.',
    city: 'Bristol',
    device: 'Galaxy S24 Ultra · Excellent',
    rating: 5,
  },
  {
    quote: "Customer service was genuinely helpful when I had a question about warranty. They called me back within the hour. Rare these days.",
    name: 'Sofía M.',
    city: 'Edinburgh',
    device: 'Pixel 8 Pro · Pristine',
    rating: 5,
  },
  {
    quote: "My Pay-in-3 on a £799 iPhone meant no interest, no fuss. Site made it obvious which phones I could afford monthly. Exactly what I wanted.",
    name: 'Dave R.',
    city: 'Birmingham',
    device: 'iPhone 15 · Good',
    rating: 5,
  },
];

/**
 * TestimonialsSection — homepage social-proof carousel with 8s auto-rotate,
 * pausable on hover. Uses the existing .section-y rhythm + brand tokens.
 */
export default function TestimonialsSection() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = DATA.length;

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % total), 8000);
    return () => clearTimeout(t);
  }, [index, paused, total]);

  const t = DATA[index];

  return (
    <section className="section-y" style={{ background: 'var(--grey-5)' }}>
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
            Rated 4.9/5 by 120,000+ UK shoppers.
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
