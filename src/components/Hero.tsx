import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';

/**
 * Hero — BM spec Section 3
 * Optimized for performance: Lazy loading for non-primary slide images.
 * Mobile-First: Fluid typography and responsive layout stacking.
 */

const SLIDES = [
  {
    eyebrow: 'Certified refurbished',
    headline: 'Premium iPhones.\nUp to 70% off new.',
    subline: 'Every device inspected, tested and backed by a 12-month warranty.',
    ctaLabel: 'Shop iPhones',
    ctaHref: '/products?brand=Apple',
    image: '/assets/iphone-15-pro-max.png',
    imageAlt: 'Refurbished iPhone',
    bgFrom: '#e0c3fc',
    bgAccent: '#8ec5fc',
  },
  {
    eyebrow: 'Galaxy S range',
    headline: 'Samsung Galaxy.\nFrom £299.',
    subline: 'Grade A refurbished Galaxy flagships — pristine condition, unbeatable price.',
    ctaLabel: 'Shop Samsung',
    ctaHref: '/products?brand=Samsung',
    image: '/assets/samsung-s24-ultra.png',
    imageAlt: 'Samsung Galaxy',
    bgFrom: '#fdfbfb',
    bgAccent: '#ebedee',
  },
  {
    eyebrow: 'Google Pixel',
    headline: 'Pure Android.\nPixel-perfect price.',
    subline: 'Google Pixel devices fully tested, certified and ready for their next owner.',
    ctaLabel: 'Shop Pixel',
    ctaHref: '/products?brand=Google',
    image: '/assets/pixel-8-pro.png',
    imageAlt: 'Google Pixel',
    bgFrom: '#e0f7fa',
    bgAccent: '#b3e5fc',
  },
  {
    eyebrow: 'Trade-in',
    headline: 'Trade your old phone.\nGet cash today.',
    subline: 'Instant quote, free postage, payment within 24 hours of receipt.',
    ctaLabel: 'Get a free quote',
    ctaHref: '/#trade-in',
    image: '/assets/iphone-15-pro-max.png',
    imageAlt: 'Trade in your phone',
    bgFrom: '#dcfce7',
    bgAccent: '#bbf7d0',
  },
];


export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const { isDesktop } = useBreakpoint();
  const total = SLIDES.length;
  const cardRef = useRef<HTMLDivElement>(null);

  const goTo = (idx: number, dir = 1) => {
    setDirection(dir);
    setCurrent((idx + total) % total);
  };

  useEffect(() => {
    const t = setTimeout(() => goTo((current + 1) % total, 1), 6000);
    return () => clearTimeout(t);
  }, [current]);

  const slide = SLIDES[current];

  return (
    <section
      aria-label="Hero carousel"
      style={{
        width: '100%',
        minHeight: 'clamp(420px, 60vw, 480px)',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${slide.bgAccent} 0%, ${slide.bgFrom} 55%)`,
        transition: `background var(--duration-slow) var(--ease-default)`,
        paddingTop: 'var(--nav-total)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0, right: 0,
          width: '50%',
          height: '100%',
          background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.25) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '1280px',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: '16px',
          paddingRight: '16px',
          height: '100%',
          position: 'relative',
          zIndex: 2,
          boxSizing: 'border-box',
        }}
        className="hero-container"
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 40 }}
            transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
            style={{
              display: 'grid',
              gridTemplateColumns: isDesktop ? 'repeat(2, 1fr)' : '1fr',
              gap: isDesktop ? '32px' : '20px',
              alignItems: 'center',
              padding: isDesktop ? '48px 0' : '32px 0',
              height: '100%',
            }}
          >
            {/* ── Left (mobile: bottom): Text block ──────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: isDesktop ? 'flex-start' : 'center', textAlign: isDesktop ? 'left' : 'center' }}>
              <div
                className="overline"
                style={{ marginBottom: '12px', color: 'var(--brand-header)' }}
              >
                {slide.eyebrow}
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'clamp(32px, 5vw, 48px)',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  color: 'var(--brand-header)',
                  marginBottom: '16px',
                  whiteSpace: 'pre-line',
                }}
              >
                {slide.headline}
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  color: 'var(--grey-70)',
                  maxWidth: '420px',
                  marginBottom: '28px',
                  lineHeight: 1.55,
                }}
              >
                {slide.subline}
              </p>

              <Link
                to={slide.ctaHref}
                className="btn btn-primary btn-lg"
                id={`hero-cta-${current}`}
                style={{
                  textDecoration: 'none',
                  padding: '0 32px',
                }}
              >
                {slide.ctaLabel} <ArrowRight size={18} />
              </Link>
            </div>

            {/* ── Right (mobile: top): Product Image ───────────── */}
            <div
              ref={cardRef}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                order: isDesktop ? 0 : -1,
              }}
            >
              <img
                src={slide.image}
                alt={slide.imageAlt}
                loading={current === 0 ? 'eager' : 'lazy'}
                style={{
                  maxHeight: isDesktop ? '320px' : '180px',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))',
                }}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '1280px',
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: '16px',
          paddingRight: '16px',
          position: 'absolute',
          bottom: '24px',
          left: '0',
          right: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          boxSizing: 'border-box',
        }}
      >
        <div className="flex items-center gap-2.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === current ? '32px' : '10px',
                height: '10px',
                borderRadius: 'var(--radius-full)',
                background: i === current ? 'var(--black)' : 'var(--grey-30)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goTo(current - 1, -1)}
            aria-label="Previous slide"
            className="btn btn-secondary"
            style={{ width: '44px', height: '44px', padding: 0, borderRadius: 'var(--radius-full)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={() => goTo(current + 1, 1)}
            aria-label="Next slide"
            className="btn btn-primary"
            style={{ width: '44px', height: '44px', padding: 0, borderRadius: 'var(--radius-full)' }}
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}
