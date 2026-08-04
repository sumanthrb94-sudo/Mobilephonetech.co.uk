import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Pause, Play, ShieldCheck, Battery, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';

/**
 * Hero — BM spec Section 3
 * Optimized for performance: Lazy loading for non-primary slide images.
 * Mobile-First: Fluid typography and responsive layout stacking.
 */

const SLIDES = [
  {
    eyebrow: 'LeHart Certified · 30-point audit',
    headline: 'Flagship iPhones.\nAuthentic quality.',
    subline: 'Battery 85%+ guaranteed. 12-month warranty. Up to 70% less than new.',
    ctaLabel: 'Shop iPhones',
    ctaHref: '/products?brand=Apple',
    image: '/assets/iphone-17-pro-max-orange.jpg',
    imageAlt: 'Certified iPhone 17 Pro Max',
    gradientFrom: '#08110d',
    gradientTo: '#0b7a5a',
    glowColor: 'rgba(14, 155, 110, 0.42)',
    savings: 'Save up to £600',
  },
  {
    eyebrow: 'Samsung Galaxy · Unlocked',
    headline: 'Android flagship.\nNo compromise.',
    subline: 'Galaxy S series — full camera, full display, from £199.',
    ctaLabel: 'Shop Samsung',
    ctaHref: '/products?brand=Samsung',
    image: '/assets/samsung-s24-ultra.png',
    imageAlt: 'Samsung Galaxy S24 Ultra',
    gradientFrom: '#0a0f14',
    gradientTo: '#0f5f6b',
    glowColor: 'rgba(20, 160, 170, 0.38)',
    savings: 'From £199',
  },
  {
    eyebrow: 'Google Pixel · Pure Android',
    headline: 'AI photography.\nRefurbished price.',
    subline: "Pixel's AI camera + 7 years of updates — certified and unlocked.",
    ctaLabel: 'Shop Pixel',
    ctaHref: '/products?brand=Google',
    image: '/assets/pixel-8-pro.png',
    imageAlt: 'Google Pixel 8 Pro',
    gradientFrom: '#07130f',
    gradientTo: '#12896a',
    glowColor: 'rgba(52, 199, 154, 0.40)',
    savings: 'From £249',
  },
  {
    eyebrow: 'Instant cash · Free collection',
    headline: 'Sell your phone.\nPaid in 24 hours.',
    subline: 'Free postage, instant quote, payment within 24 hours of receipt.',
    ctaLabel: 'Get a free quote',
    ctaHref: '/#trade-in',
    image: '/assets/iphone-17-pro-max-trio.jpg',
    imageAlt: 'Trade in your phone',
    gradientFrom: '#0d1311',
    gradientTo: '#3f4b3f',
    glowColor: 'rgba(212, 160, 74, 0.34)',
    savings: 'Best prices guaranteed',
  },
] as const;


export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { isDesktop } = useBreakpoint();
  const total = SLIDES.length;

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
        minHeight: isDesktop ? 'clamp(480px, 54vw, 600px)' : 'clamp(360px, 80vw, 480px)',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${slide.gradientFrom} 0%, ${slide.gradientTo} 100%)`,
        transition: 'background 0.6s ease',
        paddingTop: 'var(--nav-total)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Glow orb behind image */}
      <div style={{
        position: 'absolute',
        top: '50%',
        right: isDesktop ? '10%' : '50%',
        transform: isDesktop ? 'translateY(-50%)' : 'translate(50%, -40%)',
        width: isDesktop ? '380px' : '260px',
        height: isDesktop ? '380px' : '260px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${slide.glowColor} 0%, transparent 70%)`,
        pointerEvents: 'none',
        transition: 'background 0.6s ease',
      }} />

      {/* Subtle noise overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.08)',
        pointerEvents: 'none',
      }} />

      <div
        style={{
          width: '100%', maxWidth: '1280px',
          marginLeft: 'auto', marginRight: 'auto',
          paddingLeft: '20px', paddingRight: '20px',
          position: 'relative', zIndex: 2,
          boxSizing: 'border-box', flex: 1,
          display: 'flex', flexDirection: 'column',
        }}
        className="hero-container"
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ opacity: 0, x: direction * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 32 }}
            transition={{ duration: 0.42, ease: [0.2, 0, 0, 1] }}
            style={{
              display: 'grid',
              gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
              gap: isDesktop ? '48px' : '16px',
              alignItems: 'center',
              padding: isDesktop ? '48px 0 24px' : '16px 0 8px',
              flex: 1, minHeight: 0,
            }}
          >
            {/* Text column */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              justifyContent: 'center',
              alignItems: isDesktop ? 'flex-start' : 'center',
              textAlign: isDesktop ? 'left' : 'center',
            }}>
              {/* Eyebrow pill */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '999px', padding: '4px 12px',
                fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.85)', marginBottom: 16,
              }}>
                {slide.eyebrow}
              </div>

              <h1 style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'clamp(36px, 5.2vw, 68px)',
                fontWeight: 900,
                letterSpacing: '-0.04em', lineHeight: 1.0,
                color: '#ffffff',
                marginBottom: 16, whiteSpace: 'pre-line',
              }}>
                {slide.headline}
              </h1>

              <p style={{
                fontFamily: 'var(--font-body)', fontSize: '15px',
                color: 'rgba(255,255,255,0.72)', maxWidth: '400px',
                marginBottom: 28, lineHeight: 1.6,
              }}>
                {slide.subline}
              </p>

              {/* CTA row: pill button + savings text */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                justifyContent: isDesktop ? 'flex-start' : 'center',
              }}>
                <Link
                  to={slide.ctaHref}
                  id={`hero-cta-${current}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    height: 50, padding: '0 28px',
                    background: '#ffffff', color: '#0f172a',
                    fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800,
                    letterSpacing: '-0.01em', textDecoration: 'none',
                    borderRadius: '999px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.35)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.transform = 'none';
                    (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)';
                  }}
                >
                  {slide.ctaLabel} <ArrowRight size={16} />
                </Link>
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700,
                  color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap',
                }}>
                  {slide.savings}
                </span>
              </div>

              {/* Trust micro-badges */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: isDesktop ? 20 : 14,
                marginTop: 24, flexWrap: 'wrap',
                justifyContent: isDesktop ? 'flex-start' : 'center',
              }}>
                {[
                  { Icon: ShieldCheck, text: '12-month warranty' },
                  { Icon: Battery, text: '85%+ battery' },
                  { Icon: RotateCcw, text: '30-day returns' },
                ].map(({ Icon, text }) => (
                  <div key={text} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    color: 'rgba(255,255,255,0.60)',
                    fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600,
                  }}>
                    <Icon size={14} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.60)' }} />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            {/* Image column */}
            <div
              style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                order: isDesktop ? 0 : -1,
                height: isDesktop ? '360px' : '200px',
                width: '100%',
                position: 'relative',
              }}
            >
              <img
                src={slide.image}
                alt={slide.imageAlt}
                loading={current === 0 ? 'eager' : 'lazy'}
                fetchPriority={current === 0 ? 'high' : 'auto'}
                decoding="async"
                style={{
                  height: '100%', width: '100%', objectFit: 'contain',
                  filter: 'drop-shadow(0 24px 40px rgba(0,0,0,0.45))',
                  position: 'relative', zIndex: 1,
                }}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls bar */}
      <div style={{
        width: '100%', maxWidth: '1280px',
        marginLeft: 'auto', marginRight: 'auto',
        paddingLeft: '20px', paddingRight: '20px',
        paddingBottom: '20px', paddingTop: '8px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '12px',
        zIndex: 2, boxSizing: 'border-box',
      }}>
        {/* Progress bar indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === current}
              style={{
                width: i === current ? '32px' : '8px',
                height: '4px',
                borderRadius: '999px',
                background: i === current ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.30)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setIsPaused(p => !p)}
            aria-label={isPaused || reducedMotion ? 'Resume' : 'Pause'}
            aria-pressed={isPaused || reducedMotion}
            disabled={reducedMotion}
            style={{
              width: 32, height: 32, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', cursor: 'pointer',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {isPaused || reducedMotion ? <Play size={13} /> : <Pause size={13} />}
          </button>
          <button
            onClick={() => goTo(current - 1, -1)}
            aria-label="Previous slide"
            style={{
              width: 36, height: 36, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', cursor: 'pointer',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={() => goTo(current + 1, 1)}
            aria-label="Next slide"
            style={{
              width: 36, height: 36, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.95)', borderRadius: '50%', cursor: 'pointer',
              border: 'none', color: '#0f172a',
              boxShadow: '0 2px 12px rgba(0,0,0,0.30)',
            }}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
