import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, ShieldCheck, Battery, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Hero — BM spec Section 3
 * Optimized for performance: Lazy loading for non-primary slide images.
 * Mobile-First: Fluid typography and responsive layout stacking.
 */

const SLIDES = [
  {
    overline: 'Flash Sale — Up to 40% off',
    headline: 'Like new.\nAt half\nthe price.',
    body: 'Certified refurbished iPhones, inspected to a 90-point standard. 12-month warranty included — always.',
    ctaLabel: 'Shop iPhones',
    ctaHref: '/products?brand=Apple',
    image: '/assets/iphone-15-pro-max.png',
    imageAlt: 'iPhone 15 Pro Max',
    brand: 'Apple',
    model: 'iPhone 15 Pro Max',
    storage: '256 GB · Titanium',
    grade: 'Pristine',
    gradeClass: 'badge badge-pristine',
    price: '£849',
    rrp: '£1,199',
    bgFrom: '#fafafa',
    bgAccent: '#eff6ff',
  },
  {
    overline: 'New arrivals — Samsung Galaxy',
    headline: 'Premium\nAndroid.\nBig savings.',
    body: 'Galaxy S24 Ultra in Excellent condition. Save over £300 compared to new. Free next-day delivery.',
    ctaLabel: 'Shop Samsung',
    ctaHref: '/products?brand=Samsung',
    image: '/assets/samsung-s24-ultra.png',
    imageAlt: 'Samsung Galaxy S24 Ultra',
    brand: 'Samsung',
    model: 'Galaxy S24 Ultra',
    storage: '256 GB · Titanium Grey',
    grade: 'Excellent',
    gradeClass: 'badge badge-excellent',
    price: '£749',
    rrp: '£1,099',
    bgFrom: '#fafafa',
    bgAccent: '#f0fdf4',
  },
  {
    overline: 'Best sellers — Google Pixel',
    headline: 'The camera\nphone you\nactually want.',
    body: 'Google Pixel 8 Pro. AI-powered photography in Good+ condition. 7-year OS updates guaranteed.',
    ctaLabel: 'Shop Pixel',
    ctaHref: '/products?brand=Google',
    image: '/assets/pixel-8-pro.png',
    imageAlt: 'Google Pixel 8 Pro',
    brand: 'Google',
    model: 'Google Pixel 8 Pro',
    storage: '128 GB · Obsidian',
    grade: 'Excellent',
    gradeClass: 'badge badge-excellent',
    price: '£469',
    rrp: '£749',
    bgFrom: '#fafafa',
    bgAccent: '#fef3c7',
  },
];

const TRUST_ITEMS = [
  { icon: ShieldCheck, text: '12-month warranty' },
  { icon: Battery,     text: '90%+ battery health' },
  { icon: RefreshCw,   text: '30-day free returns' },
];

export default function Hero() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const total = SLIDES.length;

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
          background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.6) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="container-bm"
        style={{
          maxWidth: 'var(--container-max)',
          height: '100%',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 40 }}
            transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
            className="grid lg:grid-cols-2 gap-8 items-center py-12 lg:py-20 h-full"
          >
            {/* ── Left: Text block ──────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="overline mb-4" style={{ fontSize: 'clamp(10px, 1.5vw, 11px)' }}>{slide.overline}</div>

              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(34px, 5vw, 68px)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                  color: 'var(--black)',
                  marginBottom: '20px',
                  whiteSpace: 'pre-line',
                }}
              >
                {slide.headline}
              </h1>

              <p
                className="type-body-1"
                style={{
                  color: 'var(--grey-50)',
                  marginBottom: '32px',
                  maxWidth: '440px',
                  fontSize: 'clamp(14px, 2vw, 16px)',
                }}
              >
                {slide.body}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '40px' }}>
                <Link
                  to={slide.ctaHref}
                  className="btn btn-primary btn-lg"
                  id={`hero-cta-${current}`}
                  style={{ textDecoration: 'none', height: 'clamp(48px, 5vw, 56px)', padding: '0 32px' }}
                >
                  {slide.ctaLabel}
                  <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                </Link>
                <a href="#trade-in" className="btn btn-secondary btn-lg" style={{ height: 'clamp(48px, 5vw, 56px)', padding: '0 24px' }}>
                  Sell your phone
                </a>
              </div>

              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {TRUST_ITEMS.map((t) => (
                  <div key={t.text} className="flex items-center gap-2">
                    <t.icon size={15} style={{ color: 'var(--blue-60)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--grey-50)' }}>
                      {t.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Product card ───────────── */}
            <div className="relative hidden lg:flex justify-end">
              <div
                className="card card-xl"
                style={{
                  maxWidth: '360px',
                  width: '100%',
                  padding: 0,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 2 }}>
                  <span className={slide.gradeClass}>{slide.grade}</span>
                </div>
                <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 2 }}>
                  <span className="badge badge-savings">Save £{parseInt(slide.rrp.replace('£','')) - parseInt(slide.price.replace('£',''))}</span>
                </div>

                <div
                  style={{
                    background: 'var(--grey-5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    aspectRatio: '1.1 / 1',
                    position: 'relative',
                  }}
                >
                  <img
                    src={slide.image}
                    alt={slide.imageAlt}
                    loading={current === 0 ? "eager" : "lazy"}
                    style={{
                      maxHeight: '240px',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.10))',
                      padding: '24px',
                    }}
                  />
                </div>

                <div style={{ padding: '24px' }}>
                  <p style={{ fontSize: '11px', fontFamily: 'var(--font-sans)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-40)', marginBottom: '4px' }}>
                    {slide.brand}
                  </p>
                  <h3
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 800,
                      fontSize: '20px',
                      letterSpacing: '-0.025em',
                      color: 'var(--black)',
                      marginBottom: '4px',
                    }}
                  >
                    {slide.model}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--grey-40)', fontFamily: 'var(--font-body)', marginBottom: '16px' }}>
                    {slide.storage}
                  </p>

                  <div className="flex items-baseline gap-3 mb-4">
                    <span
                      className="type-price"
                      style={{ fontSize: '32px', color: 'var(--black)' }}
                    >
                      {slide.price}
                    </span>
                    <span style={{ fontSize: '16px', color: 'var(--grey-40)', textDecoration: 'line-through', fontFamily: 'var(--font-body)' }}>
                      {slide.rrp}
                    </span>
                  </div>

                  <div
                    className="flex gap-4 pt-4"
                    style={{ borderTop: '1px solid var(--grey-10)' }}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} style={{ color: 'var(--blue-60)' }} />
                      <span style={{ fontSize: '13px', fontFamily: 'var(--font-body)', color: 'var(--grey-50)', fontWeight: 500 }}>12m warranty</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className="container-bm"
        style={{
          maxWidth: 'var(--container-max)',
          position: 'absolute',
          bottom: '24px',
          left: '0',
          right: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
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
