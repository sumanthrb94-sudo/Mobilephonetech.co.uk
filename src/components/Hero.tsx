import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Pause, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';

/**
 * Hero — BM spec Section 3
 * Optimized for performance: Lazy loading for non-primary slide images.
 * Mobile-First: Fluid typography and responsive layout stacking.
 */

const SLIDES = [
  {
    eyebrow: 'MPM Certified · 30-point audit',
    headline: 'Flagship iPhones.\nAuthentic quality.',
    subline: 'Battery health verified. Biometrics tested. 12-month warranty included. Up to 70% less than new.',
    ctaLabel: 'Shop iPhones',
    ctaHref: '/products?brand=Apple',
    image: '/assets/iphone-17-pro-max-orange.jpg',
    imageAlt: 'Certified iPhone 17 Pro Max',
    bgFrom: '#fdf2f8',
    bgAccent: '#fce7f3',
  },
  {
    eyebrow: 'Samsung Galaxy · Unlocked',
    headline: 'Android flagship.\nNo compromise.',
    subline: 'Galaxy S series — the full camera, the full display, the full experience. From £199.',
    ctaLabel: 'Shop Samsung',
    ctaHref: '/products?brand=Samsung',
    image: '/assets/samsung-s24-ultra.png',
    imageAlt: 'Samsung Galaxy S24 Ultra',
    bgFrom: '#f0f9ff',
    bgAccent: '#e0f2fe',
  },
  {
    eyebrow: 'Google Pixel · Pure Android',
    headline: 'Computational photography.\nRefurbished price.',
    subline: "Pixel's AI camera, seven years of updates, and a clean Android experience — certified and unlocked.",
    ctaLabel: 'Shop Pixel',
    ctaHref: '/products?brand=Google',
    image: '/assets/pixel-8-pro.png',
    imageAlt: 'Google Pixel 8 Pro',
    bgFrom: '#f0fdf4',
    bgAccent: '#dcfce7',
  },
  {
    eyebrow: 'Instant cash · Free collection',
    headline: 'Sell your old phone.\nGet paid in 24 hrs.',
    subline: 'Free postage, no hidden fees, instant quote. Payment within 24 hours of receipt.',
    ctaLabel: 'Get a free quote',
    ctaHref: '/#trade-in',
    image: '/assets/iphone-17-pro-max-trio.jpg',
    imageAlt: 'Trade in your phone',
    bgFrom: '#fff7ed',
    bgAccent: '#fed7aa',
  },
];


export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { isDesktop } = useBreakpoint();
  const total = SLIDES.length;
  const cardRef = useRef<HTMLDivElement>(null);

  // Honour the OS-level reduced-motion preference so auto-advancing
  // slides stop for anyone who's asked to minimise animation.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const goTo = (idx: number, dir = 1) => {
    setDirection(dir);
    setCurrent((idx + total) % total);
  };

  useEffect(() => {
    if (isPaused || reducedMotion) return;
    const t = setTimeout(() => goTo((current + 1) % total, 1), 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, isPaused, reducedMotion]);

  const slide = SLIDES[current];

  return (
    <section
      aria-label="Hero carousel"
      style={{
        width: '100%',
        minHeight: 'clamp(170px, 22vw, 200px)',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${slide.bgAccent} 0%, ${slide.bgFrom} 55%)`,
        transition: `background var(--duration-slow) var(--ease-default)`,
        paddingTop: 'var(--nav-total)',
        display: 'flex',
        flexDirection: 'column',
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
          position: 'relative',
          zIndex: 2,
          boxSizing: 'border-box',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
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
              gap: isDesktop ? '20px' : '10px',
              alignItems: 'center',
              padding: isDesktop ? '14px 0 8px' : '8px 0 6px',
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* ── Left (mobile: bottom): Text block ──────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: isDesktop ? 'flex-start' : 'center', textAlign: isDesktop ? 'left' : 'center' }}>
              <div
                className="overline"
                style={{ marginBottom: '4px', color: 'var(--brand-header)', fontSize: '10px' }}
              >
                {slide.eyebrow}
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(22px, 3.5vw, 38px)',
                  fontWeight: 700,
                  fontStyle: 'italic',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  color: 'var(--brand-header)',
                  marginBottom: '8px',
                  whiteSpace: 'pre-line',
                }}
              >
                {slide.headline}
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: 'var(--grey-70)',
                  maxWidth: '360px',
                  marginBottom: '8px',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {slide.subline}
              </p>

              <Link
                to={slide.ctaHref}
                className="btn btn-primary btn-sm"
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
                height: isDesktop ? '120px' : '70px',
                width: '100%',
              }}
            >
              <img
                src={slide.image}
                alt={slide.imageAlt}
                loading={current === 0 ? 'eager' : 'lazy'}
                fetchPriority={current === 0 ? 'high' : 'auto'}
                decoding="async"
                style={{
                  height: '100%',
                  width: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.15))',
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
          paddingBottom: '10px',
          paddingTop: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          zIndex: 2,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === current}
              style={{
                width: i === current ? '28px' : '8px',
                height: '8px',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsPaused(p => !p)}
            aria-label={isPaused || reducedMotion ? 'Resume carousel auto-play' : 'Pause carousel auto-play'}
            aria-pressed={isPaused || reducedMotion}
            className="btn btn-secondary"
            style={{ width: '36px', height: '36px', padding: 0, borderRadius: 'var(--radius-full)' }}
            disabled={reducedMotion}
            title={reducedMotion ? 'Auto-play disabled by your system preferences' : undefined}
          >
            {isPaused || reducedMotion ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button
            onClick={() => goTo(current - 1, -1)}
            aria-label="Previous slide"
            className="btn btn-secondary"
            style={{ width: '40px', height: '40px', padding: 0, borderRadius: 'var(--radius-full)' }}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={() => goTo(current + 1, 1)}
            aria-label="Next slide"
            className="btn btn-primary"
            style={{ width: '40px', height: '40px', padding: 0, borderRadius: 'var(--radius-full)' }}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
