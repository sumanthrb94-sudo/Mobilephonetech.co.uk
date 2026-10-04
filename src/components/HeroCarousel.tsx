import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Pause, Play, ShieldCheck, Battery, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBreakpoint } from '../hooks/useBreakpoint';
import CountUp from './ui/CountUp';
import RevealText from './ui/RevealText';

/**
 * One banner. Named so the built-in set and the staff-managed set are the
 * same shape — the carousel below cannot tell which it was handed, which is
 * what makes the fallback safe. The admin Banners preview hands it a single
 * draft slide, for the same reason: it is not a mockup of this carousel,
 * it IS this carousel, previewing real data.
 */
export interface Slide {
  eyebrow: string;
  headline: string;
  subline: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  imageMobile: string;
  imageAlt: string;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
  savings: string;
  fullBleed: boolean;
  focal: string;
  focalMobile: string;
}

export const BUILT_IN_SLIDES: Slide[] = [
  {
    eyebrow: 'Apple iPhone 18 Pro Max · Titanium',
    headline: 'The next Pro.\nFor less than new.',
    subline: 'A certified refurbished Apple flagship, quality checked and backed by a 12-month warranty.',
    ctaLabel: 'Shop iPhone Pro',
    ctaHref: '/products?brand=Apple',
    image: '/assets/hero-apple-pro-desktop.png',
    imageMobile: '/assets/hero-apple-pro-mobile.png',
    imageAlt: 'Premium titanium Apple Pro smartphone shown front and back',
    gradientFrom: '#090d14',
    gradientTo: '#172033',
    glowColor: 'rgba(56, 189, 248, 0.35)',
    savings: 'Refurbished Apple value',
    fullBleed: true,
    focal: 'right center',
    focalMobile: 'center top',
  },
  {
    eyebrow: 'Samsung Galaxy S26 · Galaxy AI',
    headline: 'Galaxy power.\nRefurbished value.',
    subline: 'Premium Samsung flagships, 70-point checked, unlocked and ready for their next owner.',
    ctaLabel: 'Shop Samsung Galaxy',
    ctaHref: '/products?brand=Samsung',
    image: '/assets/hero-samsung-galaxy-desktop.png',
    imageMobile: '/assets/hero-samsung-galaxy-mobile.png',
    imageAlt: 'Premium Samsung Galaxy smartphone shown with a stylus',
    gradientFrom: '#0a0d18',
    gradientTo: '#171e3b',
    glowColor: 'rgba(99, 102, 241, 0.38)',
    savings: 'Premium Galaxy, less spend',
    fullBleed: true,
    focal: 'right center',
    focalMobile: 'center top',
  },
  {
    eyebrow: 'Google Pixel Series · Pure Android',
    headline: 'Pixel intelligence.\nBetter value.',
    subline: 'Brilliant Google phones, professionally checked and covered with a 12-month warranty.',
    ctaLabel: 'Shop Google Pixel',
    ctaHref: '/products?brand=Google',
    image: '/assets/hero-pixel-desktop.png',
    imageMobile: '/assets/hero-pixel-mobile.png',
    imageAlt: 'Premium Google Pixel smartphones in porcelain and obsidian finishes',
    gradientFrom: '#121316',
    gradientTo: '#2a323a',
    glowColor: 'rgba(147, 197, 253, 0.35)',
    savings: 'Google quality, less spend',
    fullBleed: true,
    focal: 'right center',
    focalMobile: 'center top',
  },
  {
    eyebrow: 'Tablets & iPads · Ready to create',
    headline: 'More screen.\nLess spend.',
    subline: 'Certified refurbished tablets for work, study and play, covered by a 12-month warranty.',
    ctaLabel: 'Shop Tablets',
    ctaHref: '/products?category=Tablets',
    image: '/assets/hero-tablets-v2-desktop.png',
    imageMobile: '/assets/hero-tablets-v2-mobile.png',
    imageAlt: 'Premium refurbished tablets and stylus on a blue studio background',
    gradientFrom: '#071528',
    gradientTo: '#12417a',
    glowColor: 'rgba(34, 211, 238, 0.35)',
    savings: 'Big-screen value',
    fullBleed: true,
    focal: 'right center',
    focalMobile: 'center top',
  },
  {
    eyebrow: 'Everyday essentials · Ready to go',
    headline: 'The extras.\nDone properly.',
    subline: 'Charging, power and audio essentials selected to keep your tech moving.',
    ctaLabel: 'Shop Accessories',
    ctaHref: '/products?category=Accessories',
    image: '/assets/hero-accessories-desktop.png',
    imageMobile: '/assets/hero-accessories-mobile.png',
    imageAlt: 'Wall charger, USB-C cable, wireless earbuds and power bank',
    gradientFrom: '#1a120b',
    gradientTo: '#40301c',
    glowColor: 'rgba(251, 191, 36, 0.30)',
    savings: 'Essential tech, less spend',
    fullBleed: true,
    focal: 'right center',
    focalMobile: 'center top',
  },
  {
    eyebrow: 'Console gaming · Ready for play',
    headline: 'More play.\nLess spend.',
    subline: 'Certified refurbished consoles and gaming tech, professionally checked before dispatch.',
    ctaLabel: 'Shop Gaming',
    ctaHref: '/products?category=Playables',
    image: '/assets/hero-gaming-desktop.png',
    imageMobile: '/assets/hero-gaming-mobile.png',
    imageAlt: 'White gaming console and controller on a violet studio background',
    gradientFrom: '#130b28',
    gradientTo: '#36205e',
    glowColor: 'rgba(168, 85, 247, 0.34)',
    savings: 'Gaming value, ready now',
    fullBleed: true,
    focal: 'right center',
    focalMobile: 'center top',
  },
] as const;

/**
 * Slide savings read like "Save up to £600" or "From £199" — animate the
 * figure and leave the words alone. Anything without a number ("Best prices
 * guaranteed") renders as-is rather than being forced into a counter.
 */
function renderSavings(label: string, slideIndex: number) {
  const match = /^(.*?)£([\d,]+)(.*)$/.exec(label);
  if (!match) return label;

  const [, before, digits, after] = match;
  const value = parseInt(digits.replace(/,/g, ''), 10);
  if (!Number.isFinite(value)) return label;

  return (
    <>
      {before}
      <CountUp key={`savings-${slideIndex}`} to={value} prefix="£" duration={1100} />
      {after}
    </>
  );
}

export interface HeroCarouselProps {
  slides: Slide[];
  /**
   * Off for the admin Banners preview: with one draft banner there is
   * nothing to advance to, and the only thing that should move the frame is
   * the form being edited.
   */
  autoAdvance?: boolean;
  /**
   * Forces the desktop/phone layout instead of reading the real browser
   * viewport. A preview box is its own "device" — an admin on a wide
   * monitor previewing the phone banner still needs the phone layout.
   * Falls back to the real breakpoint (the home page's own behaviour) when
   * left unset.
   */
  isDesktopOverride?: boolean;
  /** True for a contained admin preview. It must not reserve site-nav space. */
  isPreview?: boolean;
  /**
   * Bumped to replay the entrance animation without changing slides — the
   * admin preview's "Replay" button, for a single-slide preview that would
   * otherwise only ever play once, on mount.
   */
  replayKey?: number;
}

/**
 * The hero carousel itself, independent of where its slides came from.
 *
 * Home page: Hero.tsx feeds it the staff-managed banners, or the built-in
 * set when there are none. Admin: BannersPage feeds it the single banner
 * currently being edited, live, as a preview. Same component, same
 * animation, same CSS either way — nothing in the preview can drift from
 * what ships, because there is only one implementation to drift from.
 *
 * Sizing uses container query units (cqw) rather than viewport units (vw),
 * so a caller can embed this at any width — the full home page, or a
 * fixed-width admin preview box — and get correctly proportioned output
 * either way. The nearest ancestor with `containerType: 'inline-size'` is
 * what the caller is responsible for providing.
 */
export default function HeroCarousel({
  slides, autoAdvance = true, isDesktopOverride, isPreview = false, replayKey = 0,
}: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);

  // Managed banners replace the built-in set after the first paint, and there
  // are usually fewer of them. Without this the index can point past the end
  // of the new array, and the carousel renders nothing at all.
  useEffect(() => {
    setCurrent(c => (c < slides.length ? c : 0));
  }, [slides.length]);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { isDesktop: realIsDesktop } = useBreakpoint();
  const isDesktop = isDesktopOverride ?? realIsDesktop;
  const total = slides.length;

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
    if (!autoAdvance || isPaused || reducedMotion || total <= 1) return;
    const t = setTimeout(() => goTo((current + 1) % total, 1), 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, isPaused, reducedMotion, autoAdvance, total]);

  const slide = slides[current];
  if (!slide) return null;

  return (
    <section
      aria-label="Hero carousel"
      style={{
        width: '100%',
        /* ── One box, every slide ──
           Measured before this, walking the carousel: mobile ran 488, 488,
           706, 706, 706, 741 and desktop 613, 613, 749, 681, 681, 681. Each
           slide sized itself to its own content, so advancing the carousel
           moved the whole page under the reader's thumb — a 253px jump
           between the second slide and the third.

           Fixed now, not merely minimum: content fits the banner rather than
           the banner growing to the content. 125cqw on a phone is 4:5, the
           shape of the supplied assets, and is what the admin banner form
           asks uploads to be. The shop desktop banner is a fixed 480px
           3:1-style canvas, so large displays do not create empty vertical
           space. The contained admin preview scales independently. */
        height: isDesktop ? (isPreview ? '40cqw' : '480px') : '125cqw',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${slide.gradientFrom} 0%, ${slide.gradientTo} 100%)`,
        transition: 'background 0.6s ease',
        paddingTop: isDesktop && !isPreview ? 'var(--nav-total)' : 0, boxSizing: 'border-box',
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

      {/* Full-bleed slides carry their own scene, so the image IS the
          background. A left-to-right scrim keeps the copy legible over it
          without washing the product out; on phones it runs bottom-up
          instead, because the copy sits under the shot rather than beside it. */}
      {slide.fullBleed && (
        <>
          {/* A draft banner in the admin preview can have no image yet —
              src="" would ask the browser to fetch the current document as
              an image, so the tag is skipped entirely until there is one. */}
          {(isDesktop ? slide.image : slide.imageMobile) && (
            <img
              key={slide.image}
              src={isDesktop ? slide.image : slide.imageMobile}
              alt={slide.imageAlt}
              loading={current === 0 ? 'eager' : 'lazy'}
              fetchPriority={current === 0 ? 'high' : 'auto'}
              decoding="async"
              style={{
                position: 'absolute', top: 0,
                left: 0, right: 0, bottom: 0, zIndex: 0, width: '100%',
                objectFit: 'cover', objectPosition: isDesktop ? slide.focal : slide.focalMobile, height: '100%',
              }}
            />
          )}
          {/* Scrim.
              The mobile stops are set from where the copy actually lands, not
              by eye. Measured on a 390px phone, as a percentage of the banner:

                slide            copy top   headline
                foldable duo        40%      49-64%
                iPhone crimson      47%      56-71%

              The previous ramp was fully transparent until 55%, so on the
              foldable the eyebrow and the top half of the headline had no
              cover at all and sat on the specular highlight coming off the
              phones — grey text on a lit reflection. The crimson slide only
              looked fine because its image happens to be dark where the words
              fall, which is luck, not a design.

              So the ramp now begins at 26% and carries real weight by 38%,
              ahead of the earliest copy on either slide with room to spare for
              a headline that wraps to a third line. It stays soft through the
              top third, which is where the devices are: the point is to read
              the words, not to flatten the picture the client supplied. */}
          <div style={{
            position: 'absolute', top: 0,
            left: 0, right: 0, bottom: 0, zIndex: 1, pointerEvents: 'none',
            background: isDesktop
              ? 'linear-gradient(90deg, rgba(6,8,14,0.95) 0%, rgba(6,8,14,0.82) 34%, rgba(6,8,14,0.30) 58%, rgba(6,8,14,0) 82%)'
              : 'linear-gradient(180deg, rgba(6,8,14,0) 0%, rgba(6,8,14,0) 42%, rgba(6,8,14,0.28) 52%, rgba(6,8,14,0.74) 66%, rgba(6,8,14,0.92) 82%, rgba(6,8,14,0.96) 100%)',
          }} />
        </>
      )}

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
            key={`${current}-${replayKey}`}
            custom={direction}
            initial={{ opacity: 0, x: direction * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 32 }}
            transition={{ duration: 0.42, ease: [0.2, 0, 0, 1] }}
            style={{
              display: 'grid',
              gridTemplateColumns: isDesktop && !slide.fullBleed ? '1fr 1fr' : '1fr',
              gap: isDesktop ? '48px' : '16px',
              alignItems: isDesktop ? 'center' : 'end',
              padding: isDesktop ? '28px 0 22px' : '0 0 12px',
              flex: 1, minHeight: 0,
            }}
          >
            {/* Text column */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              justifyContent: 'center',
              alignItems: isDesktop ? 'flex-start' : 'center',
              textAlign: isDesktop ? 'left' : 'center',
              maxWidth: isDesktop && slide.fullBleed ? '480px' : undefined,
            }}>
              {/* Phone banners reserve their upper half for the product. The
                  desktop eyebrow stays useful, but on a 4:5 frame it steals
                  the exact space that keeps the product and copy separate. */}
              {isDesktop && <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '999px', padding: '4px 12px',
                fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.85)', marginBottom: 12,
              }}>
                {slide.eyebrow}
              </div>}

              <RevealText
                as="h1"
                /* Keyed on the TEXT, not just the index. Managed banners
                   arrive after the first paint and replace the built-in set
                   in place; at index 0 the key did not change, so React
                   reused this instance and the headline stayed on the old
                   copy while the button beside it updated. */
                key={`headline-${current}-${slide.headline}-${replayKey}`}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: isDesktop ? 'clamp(32px, 3.8cqw, 50px)' : 'clamp(28px, 8.2cqw, 34px)',
                  fontWeight: 900,
                  letterSpacing: '-0.04em', lineHeight: 1.0,
                  color: '#ffffff',
                  marginBottom: 16, whiteSpace: 'pre-line',
                }}
              >
                {slide.headline}
              </RevealText>

              {/* The subline is the first thing to go in a phone-width banner:
                  the headline and the CTA are what the slide is for, and two
                  more lines of body copy push the product out of frame. */}
              {isDesktop && (
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: '15px',
                  color: 'rgba(255,255,255,0.72)', maxWidth: '400px',
                  marginBottom: 28, lineHeight: 1.6,
                }}>
                  {slide.subline}
                </p>
              )}

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
                    background: '#ffffff', color: 'var(--black)',
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
                {isDesktop && slide.savings && (
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700,
                    color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap',
                  }}>
                    {renderSavings(slide.savings, current)}
                  </span>
                )}
              </div>

              {/* Trust micro-badges. Held back inside a phone-width banner:
                  eyebrow, headline, subline, CTA, savings and three badges
                  do not fit over a 390px scene without landing on the
                  product. They still run on every other slide, and the same
                  three claims sit in the trust strip directly above. */}
              {isDesktop && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: isDesktop ? 20 : 14,
                marginTop: 18, flexWrap: 'wrap',
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
              )}
            </div>

            {/* Image column — only when the slide does not carry its own
                scene as the background, or the shot renders twice. */}
            {!slide.fullBleed && (
            <div
              style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                // On phones the copy leads and the shot follows. The image used
                // to be ordered first, which pushed the headline and the primary
                // CTA below the fold on a 390×644 viewport.
                order: 0,
                height: isDesktop ? '300px' : '168px',
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
                  height: '100%', width: '100%',
                  objectFit: slide.fullBleed ? 'cover' : 'contain',
                  objectPosition: slide.fullBleed ? '62% 45%' : 'center',
                  borderRadius: slide.fullBleed ? 'var(--radius-lg)' : 0,
                  filter: slide.fullBleed ? 'none' : 'drop-shadow(0 24px 40px rgba(0,0,0,0.45))',
                  position: 'relative', zIndex: 1,
                }}
              />
            </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls bar — pointless with nothing to advance to or between. */}
      {total > 1 && (
      <div style={{
        width: '100%', maxWidth: '1280px',
        marginLeft: 'auto', marginRight: 'auto',
        paddingLeft: '20px', paddingRight: '20px',
        paddingBottom: '20px', paddingTop: '8px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '12px',
        zIndex: 2, boxSizing: 'border-box',
      }}>
        {/* Progress bar indicators.
            The bar stays 4px tall — the button around it does not. A 8×4px
            hit area is roughly a fifth of a fingertip, so the transparent
            button is padded out to 24px of height and the visible bar is an
            inner span. Nothing moves visually; the target just becomes
            reachable. Vertical padding rather than a min-height so the bars
            stay optically centred on the row. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '-6px' }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === current}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '10px 6px',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: i === current ? '32px' : '8px',
                  height: '4px',
                  borderRadius: '999px',
                  background: i === current ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.30)',
                  transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
            </button>
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
              border: 'none', color: 'var(--black)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.30)',
            }}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      )}
    </section>
  );
}
