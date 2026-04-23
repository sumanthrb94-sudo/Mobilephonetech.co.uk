import React from 'react';
import { Product } from '../types';
import ProductImage from './ProductImage';

/**
 * ProductGalleryFrame — Claude-designed product "views".
 *
 * Each product ships with one real product photo in imageUrl. This
 * component layers 5 additional stylistic treatments on top of that
 * single source so shoppers get a 6-frame gallery without us inventing
 * fake photography: hero / back / profile / colourways / detail / lifestyle.
 *
 * Everything uses the existing token palette (--grey-5, --grey-10,
 * --color-brand-subtle, --brand-cyan, --brand-header) so the frames feel
 * native to the rest of the UI.
 */

export type FrameKind = 'hero' | 'back' | 'profile' | 'colorways' | 'detail' | 'lifestyle';

export const FRAMES: { kind: FrameKind; label: string }[] = [
  { kind: 'hero',      label: 'Front'   },
  { kind: 'back',      label: 'Back'    },
  { kind: 'profile',   label: 'Side'    },
  { kind: 'colorways', label: 'Colours' },
  { kind: 'detail',    label: 'Detail'  },
  { kind: 'lifestyle', label: 'In use'  },
];

const SWATCH_PALETTES: Record<string, string[]> = {
  Apple:   ['#1A1A1A', '#C0C0C0', '#4A90E2', '#F5E6D3', '#F5F5F5'],
  Samsung: ['#0D0D0D', '#E8E8E8', '#4A90E2', '#FFD700', '#6C4A8A'],
  Google:  ['#0D0D0D', '#F5F5F5', '#2B3E3F', '#CBD5B5', '#E4C2B5'],
  default: ['#1A1A1A', '#E8E8E8', '#4A90E2', '#9F9F9F', '#F0E6D2'],
};

export default function ProductGalleryFrame({
  product,
  kind,
}: {
  product: Product;
  kind: FrameKind;
}) {
  const swatches = SWATCH_PALETTES[product.brand] ?? SWATCH_PALETTES.default;

  // Every frame shares the same square art-board. Background, imagery
  // treatment and overlays change per-frame.
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {kind === 'hero' && <HeroFrame product={product} />}
      {kind === 'back' && <BackFrame product={product} />}
      {kind === 'profile' && <ProfileFrame product={product} />}
      {kind === 'colorways' && <ColorwaysFrame product={product} swatches={swatches} />}
      {kind === 'detail' && <DetailFrame product={product} />}
      {kind === 'lifestyle' && <LifestyleFrame product={product} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Frame 1 — Hero (centered product on subtle cyan wash)
// ─────────────────────────────────────────────────────────────────────
function HeroFrame({ product }: { product: Product }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, var(--color-brand-subtle) 0%, var(--grey-5) 100%)' }} />
      <SoftGroundShadow />
      <div style={{ position: 'relative', width: '70%', height: '70%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ProductImage brand={product.brand} model={product.model} storage={product.storage} imageUrl={product.imageUrl} alt={`${product.model} — front view`} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Frame 2 — Back (flipped horizontally, warmer tint)
// ─────────────────────────────────────────────────────────────────────
function BackFrame({ product }: { product: Product }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, var(--grey-5) 0%, var(--grey-10) 100%)' }} />
      <svg
        aria-hidden
        viewBox="0 0 400 400"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }}
      >
        <circle cx="200" cy="200" r="160" fill="none" stroke="var(--brand-cyan)" strokeWidth="1" strokeDasharray="3 4" />
        <circle cx="200" cy="200" r="110" fill="none" stroke="var(--brand-cyan)" strokeWidth="1" strokeDasharray="3 4" />
      </svg>
      <SoftGroundShadow />
      <div style={{ position: 'relative', width: '65%', height: '65%', transform: 'scaleX(-1)', filter: 'brightness(0.96)' }}>
        <ProductImage brand={product.brand} model={product.model} storage={product.storage} imageUrl={product.imageUrl} alt={`${product.model} — back view`} />
      </div>
      <CornerLabel text="Back" />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Frame 3 — Side / thin profile silhouette
// ─────────────────────────────────────────────────────────────────────
function ProfileFrame({ product }: { product: Product }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--grey-0)' }} />
      <svg aria-hidden viewBox="0 0 400 400" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* Subtle horizon line */}
        <line x1="0" y1="260" x2="400" y2="260" stroke="var(--grey-10)" strokeWidth="1" />
      </svg>
      <div
        aria-hidden
        style={{
          position: 'relative',
          width: '14px',
          height: '55%',
          borderRadius: '8px',
          background: 'linear-gradient(180deg, var(--grey-80) 0%, var(--grey-90) 60%, var(--grey-70) 100%)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Button marks */}
        <span style={{ position: 'absolute', left: '-3px', top: '22%', width: '3px', height: '8px', background: 'var(--grey-70)', borderRadius: '1px' }} />
        <span style={{ position: 'absolute', left: '-3px', top: '34%', width: '3px', height: '14px', background: 'var(--grey-70)', borderRadius: '1px' }} />
        <span style={{ position: 'absolute', right: '-3px', top: '28%', width: '3px', height: '22px', background: 'var(--grey-70)', borderRadius: '1px' }} />
      </div>
      <div style={{ position: 'absolute', bottom: '16%', left: 0, right: 0, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-50)' }}>
        Slim profile · {product.model}
      </div>
      <CornerLabel text="Side" />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Frame 4 — Colourways swatches row
// ─────────────────────────────────────────────────────────────────────
function ColorwaysFrame({ product, swatches }: { product: Product; swatches: string[] }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--grey-5)' }} />
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '28px', padding: 'clamp(16px, 4vw, 32px)', boxSizing: 'border-box' }}>
        {/* Small hero image at the top */}
        <div style={{ width: '52%', maxWidth: '220px', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ProductImage brand={product.brand} model={product.model} storage={product.storage} imageUrl={product.imageUrl} alt={`${product.model} — colour options`} />
        </div>

        {/* Swatch row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 2vw, 18px)' }}>
          {swatches.map((c, i) => (
            <span
              key={i}
              aria-hidden
              style={{
                width: 'clamp(22px, 4vw, 34px)',
                height: 'clamp(22px, 4vw, 34px)',
                borderRadius: '50%',
                background: c,
                border: '2px solid var(--grey-0)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15), 0 0 0 1px var(--grey-20)',
              }}
            />
          ))}
        </div>

        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-50)' }}>
          {swatches.length} finishes available
        </div>
      </div>
      <CornerLabel text="Colours" />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Frame 5 — Detail (zoomed-in crop with focus ring)
// ─────────────────────────────────────────────────────────────────────
function DetailFrame({ product }: { product: Product }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, var(--grey-95) 0%, var(--brand-header) 100%)' }} />
      <div
        style={{
          position: 'relative',
          width: '120%',
          height: '120%',
          transform: 'scale(1.6) translate(-6%, 2%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.4))',
        }}
      >
        <ProductImage brand={product.brand} model={product.model} storage={product.storage} imageUrl={product.imageUrl} alt={`${product.model} — camera & finish detail`} />
      </div>

      {/* Focus ring + caption */}
      <svg aria-hidden viewBox="0 0 400 400" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <circle cx="200" cy="190" r="94" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeDasharray="4 6" />
        <circle cx="200" cy="190" r="66" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      </svg>
      <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        <span>Detail view</span>
        <span style={{ color: 'var(--brand-cyan)' }}>2×</span>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Frame 6 — Lifestyle (hand-held vibe, abstract scene behind)
// ─────────────────────────────────────────────────────────────────────
function LifestyleFrame({ product }: { product: Product }) {
  return (
    <>
      <svg aria-hidden viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="lifestyle-bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-cyan)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--brand-header)" stopOpacity="0.05" />
          </linearGradient>
          <radialGradient id="lifestyle-sun" cx="0.8" cy="0.2" r="0.6">
            <stop offset="0%" stopColor="var(--brand-cyan)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--brand-cyan)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="400" height="400" fill="url(#lifestyle-bg)" />
        <rect width="400" height="400" fill="url(#lifestyle-sun)" />

        {/* Soft landscape shapes */}
        <circle cx="60" cy="300" r="140" fill="var(--brand-cyan)" fillOpacity="0.08" />
        <circle cx="350" cy="340" r="90" fill="var(--brand-header)" fillOpacity="0.08" />

        {/* Stylised desk line */}
        <line x1="0" y1="320" x2="400" y2="340" stroke="var(--brand-header)" strokeOpacity="0.15" strokeWidth="1" />
      </svg>

      <div style={{ position: 'relative', width: '60%', height: '60%', transform: 'rotate(-6deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.18))' }}>
        <ProductImage brand={product.brand} model={product.model} storage={product.storage} imageUrl={product.imageUrl} alt={`${product.model} — in everyday use`} />
      </div>

      <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)', borderRadius: 'var(--radius-full)', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand-header)' }}>
        In everyday use
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Shared bits
// ─────────────────────────────────────────────────────────────────────
function SoftGroundShadow() {
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '14%',
        transform: 'translateX(-50%)',
        width: '46%',
        height: '12px',
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(4px)',
        pointerEvents: 'none',
      }}
    />
  );
}

function CornerLabel({ text }: { text: string }) {
  return (
    <span
      style={{
        position: 'absolute',
        top: '14px',
        right: '14px',
        padding: '3px 8px',
        background: 'var(--grey-0)',
        color: 'var(--grey-70)',
        border: '1px solid var(--grey-20)',
        borderRadius: 'var(--radius-full)',
        fontFamily: 'var(--font-sans)',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {text}
    </span>
  );
}
