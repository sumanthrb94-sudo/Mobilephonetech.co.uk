import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, ShieldCheck, Battery, RefreshCw, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Hero — BM spec Section 3
 * - Full-width gradient background (diagonal warm tint)
 * - Left: Playfair Display serif headline + body + CTA
 * - Right: Product card (white bg, condition badge, price)
 * - Carousel dots + left/right arrows
 * - ~450px desktop, stacks on mobile
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

  // Auto-advance
  useEffect(() => {
    const t = setTimeout(() => goTo((current + 1) % total, 1), 6000);
    return () => clearTimeout(t);
  }, [current]);

  const slide = SLIDES[current];

  return (
    <section
      aria-label="Hero carousel"
      style={{
        /* BM spec: gradient bg, full-width, ~450px desktop */
        width: '100%',
        minHeight: 'clamp(380px, 50vw, 460px)',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${slide.bgAccent} 0%, ${slide.bgFrom} 55%)`,
        transition: `background var(--duration-slow) var(--ease-default)`,
        paddingTop: 'var(--nav-total)', /* 112px offset for fixed header + catnav */
      }}
    >
      {/* Subtle diagonal shape */}
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
            className="grid lg:grid-cols-2 gap-8 items-center py-12 lg:py-16 h-full"
          >
            {/* ── Left: Text block ──────────────── */}
            <div>
              {/* Overline */}
              <div className="overline mb-4">{slide.overline}</div>

              {/* Headline — Playfair Display serif, BM spec "punchline" */}
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(38px, 5.5vw, 68px)',
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

              {/* Body — BM spec body-1 */}
              <p
                className="type-body-1"
                style={{
                  color: 'var(--grey-50)',
                  marginBottom: '32px',
                  maxWidth: '400px',
                }}
              >
                {slide.body}
              </p>

              {/* CTA — Primary black button (BM spec) */}
              <div className="flex flex-wrap gap-3 mb-10">
                <Link
                  to={slide.ctaHref}
                  className="btn btn-primary btn-lg"
                  id={`hero-cta-${current}`}
                  style={{ textDecoration: 'none' }}
                >
                  {slide.ctaLabel}
                  <ArrowRight size={18} />
                </Link>
                <a href="#trade-in" className="btn btn-secondary btn-lg">
                  Sell your phone
                </a>
              </div>

              {/* Trust micro-row */}
              <div className="flex flex-wrap gap-6">
                {TRUST_ITEMS.map((t) => (
                  <div key={t.text} className="flex items-center gap-2">
                    <t.icon size={15} style={{ color: 'var(--blue-60)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, color: 'var(--grey-50)' }}>
                      {t.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Product card ───────────── */}
            <div className="relative flex justify-center lg:justify-end">
              <div
                className="card card-xl"
                style={{
                  maxWidth: '340px',
                  width: '100%',
                  padding: 0,
                  overflow: 'hidden',
                }}
              >
                {/* Badges */}
                <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 2 }}>
                  <span className={slide.gradeClass}>{slide.grade}</span>
                </div>
                <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 2 }}>
                  <span className="badge badge-savings">Save £{parseInt(slide.rrp.replace('£','')) - parseInt(slide.price.replace('£',''))}</span>
                </div>

                {/* Product image */}
                <div
                  style={{
                    background: 'var(--grey-5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    aspectRatio: '1 / 1',
                    position: 'relative',
                  }}
                >
                  <img
                    src={slide.image}
                    alt={slide.imageAlt}
                    style={{
                      maxHeight: '220px',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 12px 32px rgba(0,0,0,0.10))',
                      padding: '24px',
                    }}
                  />
                </div>

                {/* Info */}
                <div style={{ padding: '20px 20px 16px' }}>
                  <p style={{ fontSize: '11px', fontFamily: 'var(--font-sans)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-40)', marginBottom: '4px' }}>
                    Apple
                  </p>
                  <h3
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 800,
                      fontSize: '18px',
                      letterSpacing: '-0.025em',
                      color: 'var(--black)',
                      marginBottom: '2px',
                    }}
                  >
                    {slide.model}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--grey-40)', fontFamily: 'var(--font-body)', marginBottom: '12px' }}>
                    {slide.storage}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-3 mb-3">
                    <span
                      className="type-price"
                      style={{ fontSize: '28px', color: 'var(--black)' }}
                    >
                      {slide.price}
                    </span>
                    <span style={{ fontSize: '15px', color: 'var(--grey-40)', textDecoration: 'line-through', fontFamily: 'var(--font-body)' }}>
                      {slide.rrp}
                    </span>
                  </div>

                  {/* Trust row */}
                  <div
                    className="flex gap-4 pt-3"
                    style={{ borderTop: '1px solid var(--grey-10)' }}
                  >
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={13} style={{ color: 'var(--blue-60)' }} />
                      <span style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--grey-50)' }}>12m warranty</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Battery size={13} style={{ color: '#10b981' }} />
                      <span style={{ fontSize: '12px', fontFamily: 'var(--font-body)', color: 'var(--grey-50)' }}>94% battery</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Carousel Controls ───────────────────── */}
      <div
        className="container-bm"
        style={{
          maxWidth: 'var(--container-max)',
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === current ? '24px' : '8px',
                height: '8px',
                borderRadius: 'var(--radius-full)',
                background: i === current ? 'var(--black)' : 'var(--grey-30)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all var(--duration-normal) var(--ease-bounce)',
              }}
            />
          ))}
        </div>

        {/* Arrow buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goTo(current - 1, -1)}
            aria-label="Previous slide"
            className="btn btn-secondary btn-sm"
            style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={() => goTo(current + 1, 1)}
            aria-label="Next slide"
            className="btn btn-primary btn-sm"
            style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
