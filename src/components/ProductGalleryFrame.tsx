import React, { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Product } from '../types';
import ProductImage from './ProductImage';
import {
  Smartphone, Sparkles, Ruler, Package, Palette,
  ZoomIn, Check, CreditCard, Cable, Wrench, FileText,
  Headphones, BatteryCharging, Plug, Gamepad2, Watch,
  ChevronsRight, Info,
} from 'lucide-react';

/**
 * ProductGalleryFrame — 5-tab trust gallery designed for refurb buyers.
 *
 * Each tab has a distinct job, not just a styling variation of the same
 * product photo:
 *
 *   product    — real photo with click-to-zoom
 *   condition  — deterministic cosmetic-wear map driven by product.grade
 *   scale      — device silhouette + credit-card reference for size
 *   inbox      — "what's in the box" flat-lay, contents vary by category
 *   colorways  — swatch palette for the brand
 *
 * `compact` strips all decorative text / overlays so every frame still
 * reads at ~50-80px for the thumbnail rail.
 */

export type FrameKind = 'product' | 'condition' | 'scale' | 'inbox' | 'colorways';

export const FRAMES: { kind: FrameKind; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { kind: 'product',   label: 'Product',   icon: Smartphone },
  { kind: 'condition', label: 'Condition', icon: Sparkles },
  { kind: 'scale',     label: 'Scale',     icon: Ruler },
  { kind: 'inbox',     label: 'In the box', icon: Package },
  { kind: 'colorways', label: 'Colours',   icon: Palette },
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
  compact = false,
}: {
  product: Product;
  kind: FrameKind;
  compact?: boolean;
}) {
  const swatches = SWATCH_PALETTES[product.brand] ?? SWATCH_PALETTES.default;

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
      {kind === 'product'   && <ProductFrame   product={product} compact={compact} />}
      {kind === 'condition' && <ConditionFrame product={product} compact={compact} />}
      {kind === 'scale'     && <ScaleFrame     product={product} compact={compact} />}
      {kind === 'inbox'     && <InBoxFrame     product={product} compact={compact} />}
      {kind === 'colorways' && <ColorwaysFrame product={product} swatches={swatches} compact={compact} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Frame 1 — Product (real photo, click-to-zoom on the big stage)
// ─────────────────────────────────────────────────────────────────────
function ProductFrame({ product, compact }: { product: Product; compact?: boolean }) {
  const [zoom, setZoom] = useState<{ scale: number; origin: string }>({ scale: 1, origin: '50% 50%' });
  const ref = useRef<HTMLDivElement>(null);

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (compact) return;
    if (zoom.scale > 1) {
      setZoom({ scale: 1, origin: '50% 50%' });
      return;
    }
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom({ scale: 2.2, origin: `${x}% ${y}%` });
  };

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, var(--color-brand-subtle) 0%, var(--grey-5) 100%)' }} />
      <SoftGroundShadow />
      <div
        ref={ref}
        onClick={onClick}
        style={{
          position: 'relative',
          width: '72%',
          height: '72%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: compact ? 'default' : zoom.scale > 1 ? 'zoom-out' : 'zoom-in',
          transform: `scale(${zoom.scale})`,
          transformOrigin: zoom.origin,
          transition: 'transform 0.28s var(--ease-default, cubic-bezier(0.2, 0, 0, 1))',
        }}
      >
        <ProductImage brand={product.brand} model={product.model} storage={product.storage} category={product.category} imageUrl={product.imageUrl} alt={`${product.model}`} />
      </div>
      {!compact && zoom.scale === 1 && (
        <span
          style={{
            position: 'absolute',
            bottom: '14px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(6px)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--grey-10)',
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--grey-60)',
            pointerEvents: 'none',
          }}
        >
          <ZoomIn size={12} /> Tap to zoom
        </span>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Frame 2 — Condition map (deterministic wear based on product.grade)
// ─────────────────────────────────────────────────────────────────────
type Mark = { x: number; y: number; label: string };
const GRADE_COPY: Record<string, { marks: number; headline: string; body: string }> = {
  Pristine:  { marks: 0, headline: 'Like new',           body: 'No visible cosmetic defects. Battery health 95%+.' },
  Excellent: { marks: 1, headline: 'Barely used',        body: 'May have 1 near-invisible mark. Battery health 90%+.' },
  Good:      { marks: 3, headline: 'Light cosmetic wear',body: '2-3 small marks, not visible from arm\'s length.' },
  Fair:      { marks: 5, headline: 'Visible cosmetic wear',body: 'Scratches and marks visible on close inspection. Fully functional.' },
  New:       { marks: 0, headline: 'New sealed',         body: 'Sealed retail unit. Full manufacturer warranty.' },
};
const MARK_COPY = [
  'Micro-scratch on bezel',
  'Tiny mark on back',
  'Faint scuff near edge',
  'Small nick on corner',
  'Surface mark on back',
  'Light scratch on frame',
];

function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6D2B79F5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ConditionFrame({ product, compact }: { product: Product; compact?: boolean }) {
  const grade = GRADE_COPY[product.grade] ?? GRADE_COPY.Good;
  const rand = seededRandom(`${product.id}:${product.grade}`);
  const marks: Mark[] = Array.from({ length: grade.marks }, (_, i) => ({
    x: 25 + rand() * 50,  // inside the device rect
    y: 20 + rand() * 60,
    label: MARK_COPY[Math.floor(rand() * MARK_COPY.length)],
  }));

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, var(--grey-0) 0%, var(--grey-5) 100%)' }} />

      {/* Device outline */}
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <rect x="32" y="14" width="36" height="72" rx="6" fill="var(--grey-0)" stroke="var(--grey-30)" strokeWidth="0.8" />
        <rect x="35" y="18" width="30" height="58" rx="2" fill="var(--grey-5)" />
        <circle cx="50" cy="81" r="2" fill="var(--grey-10)" stroke="var(--grey-30)" strokeWidth="0.3" />

        {!compact && marks.map((m, i) => (
          <g key={i}>
            <circle cx={m.x} cy={m.y} r="1.2" fill="var(--color-sale)" stroke="var(--grey-0)" strokeWidth="0.3" />
            <circle cx={m.x} cy={m.y} r="3" fill="none" stroke="var(--color-sale)" strokeOpacity="0.35" strokeWidth="0.3" />
          </g>
        ))}
      </svg>

      {!compact && (
        <>
          {/* Top-left grade headline */}
          <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-50)' }}>
              {grade.marks === 0 ? <Check size={12} color="var(--color-trust-text)" /> : <Info size={12} />} Grade · {product.grade}
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--black)' }}>
              {grade.headline}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--grey-50)', lineHeight: 1.4 }}>
              {grade.body}
            </span>
          </div>

          {/* Bottom-left legend */}
          {marks.length > 0 && (
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--grey-50)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-sale)' }} /> Cosmetic marks shown to scale
            </div>
          )}
          {marks.length === 0 && (
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--color-trust-soft, rgba(16,185,129,0.12))', color: 'var(--color-trust-text)', borderRadius: 'var(--radius-full)', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <Check size={12} /> No cosmetic defects
            </div>
          )}
        </>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Frame 3 — Scale (device silhouette + credit-card reference)
// ─────────────────────────────────────────────────────────────────────
function ScaleFrame({ product, compact }: { product: Product; compact?: boolean }) {
  // Display-size from specs gives a rough scale hint; otherwise a neutral
  // phone-shaped silhouette is used.
  const displaySize = product.specs?.display ?? '';
  const hasDisplay = /\d+(\.\d+)?\s*("|in)/.test(displaySize);

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--grey-5)' }} />

      <svg aria-hidden viewBox="0 0 200 160" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* Device silhouette */}
        <rect x="58" y="18" width="44" height="124" rx="7" fill="var(--grey-0)" stroke="var(--grey-30)" strokeWidth="1" />
        <rect x="62" y="24" width="36" height="108" rx="3" fill="var(--brand-header)" opacity="0.82" />
        <circle cx="80" cy="138" r="1.2" fill="var(--grey-20)" />

        {/* Credit card reference (85.6 × 53.98 mm) */}
        <rect x="118" y="62" width="66" height="42" rx="4" fill="var(--grey-0)" stroke="var(--grey-30)" strokeWidth="1" />
        <rect x="124" y="72" width="16" height="10" rx="1.5" fill="var(--brand-cyan)" opacity="0.5" />
        <rect x="124" y="88" width="40" height="2" rx="1" fill="var(--grey-20)" />
        <rect x="124" y="94" width="30" height="2" rx="1" fill="var(--grey-20)" />

        {!compact && (
          <>
            <text x="80" y="156" textAnchor="middle" fontSize="7" fontFamily="var(--font-sans)" fontWeight="700" fill="var(--grey-50)" letterSpacing="0.6">DEVICE</text>
            <text x="151" y="120" textAnchor="middle" fontSize="7" fontFamily="var(--font-sans)" fontWeight="700" fill="var(--grey-50)" letterSpacing="0.6">CREDIT CARD</text>
          </>
        )}
      </svg>

      {!compact && (
        <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-50)' }}>
            <Ruler size={12} /> Size reference
          </span>
          {hasDisplay && (
            <div style={{ marginTop: '4px', fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 700, color: 'var(--black)' }}>
              {displaySize} display
            </div>
          )}
        </div>
      )}

      {!compact && (
        <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {product.specs?.display && <Chip>{product.specs.display}</Chip>}
          {product.specs?.battery && <Chip>{product.specs.battery}</Chip>}
          <Chip>Ref. card 85.6 × 53.98 mm</Chip>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Frame 4 — In the box (contents vary by category)
// ─────────────────────────────────────────────────────────────────────
type BoxItem = { icon: React.ComponentType<{ size?: number }>; label: string };
function contentsForCategory(category: string): BoxItem[] {
  const map: Record<string, BoxItem[]> = {
    Phones:       [{ icon: Smartphone, label: 'Device' }, { icon: Cable, label: 'USB cable' }, { icon: Wrench, label: 'SIM tool' }, { icon: FileText, label: 'Documentation' }],
    Tablets:      [{ icon: Smartphone, label: 'Device' }, { icon: Cable, label: 'USB-C cable' }, { icon: FileText, label: 'Documentation' }],
    'Ipads & Tabs': [{ icon: Smartphone, label: 'Device' }, { icon: Cable, label: 'USB-C cable' }, { icon: FileText, label: 'Documentation' }],
    Hearables:    [{ icon: Headphones, label: 'Earbuds + case' }, { icon: Cable, label: 'USB-C cable' }, { icon: Package, label: 'Ear tips' }, { icon: FileText, label: 'Documentation' }],
    Speakers:     [{ icon: Package, label: 'Speaker' }, { icon: Plug, label: 'Power cable' }, { icon: FileText, label: 'Documentation' }],
    Smartwatches: [{ icon: Watch, label: 'Watch' }, { icon: BatteryCharging, label: 'Magnetic charger' }, { icon: Package, label: 'Strap' }, { icon: FileText, label: 'Documentation' }],
    Playables:    [{ icon: Gamepad2, label: 'Console' }, { icon: Gamepad2, label: 'Controller' }, { icon: Plug, label: 'Power cable' }, { icon: Cable, label: 'HDMI cable' }],
    Gaming:       [{ icon: Gamepad2, label: 'Console' }, { icon: Gamepad2, label: 'Controller' }, { icon: Plug, label: 'Power cable' }, { icon: Cable, label: 'HDMI cable' }],
    Accessories:  [{ icon: Package, label: 'Product' }, { icon: FileText, label: 'Documentation' }],
    Computing:    [{ icon: Package, label: 'Laptop' }, { icon: Plug, label: 'Power adapter' }, { icon: FileText, label: 'Documentation' }],
  };
  return map[category] ?? map.Accessories;
}

function InBoxFrame({ product, compact }: { product: Product; compact?: boolean }) {
  const items = contentsForCategory(product.category);

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--grey-0)' }} />

      {/* Dashed box outline */}
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: '8%', width: '84%', height: '84%' }}>
        <rect x="1" y="1" width="98" height="98" rx="3" fill="none" stroke="var(--grey-20)" strokeWidth="0.5" strokeDasharray="2 2" />
      </svg>

      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)', gap: compact ? '8px' : '16px', padding: compact ? '18%' : '18% 22%', width: '100%', height: '100%', boxSizing: 'border-box', placeItems: 'center' }}>
        {items.slice(0, 4).map((it, i) => {
          const Icon = it.icon;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? '2px' : '6px' }}>
              <div style={{ width: compact ? '60%' : '44px', aspectRatio: '1/1', borderRadius: 'var(--radius-md)', background: 'var(--grey-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-header)' }}>
                <Icon size={compact ? 14 : 22} />
              </div>
              {!compact && (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, color: 'var(--grey-60)', textAlign: 'center' }}>{it.label}</span>
              )}
            </div>
          );
        })}
      </div>

      {!compact && (
        <>
          <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-50)' }}>
            <Package size={12} /> What's in the box
          </div>
          <div style={{ position: 'absolute', bottom: '14px', left: '16px', right: '16px', fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--grey-50)', lineHeight: 1.4 }}>
            Refurbished units may not include original retail box or accessories.
          </div>
        </>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Frame 5 — Colourways (existing; compact variant uses a 3×2 grid)
// ─────────────────────────────────────────────────────────────────────
function ColorwaysFrame({ product, swatches, compact }: { product: Product; swatches: string[]; compact?: boolean }) {
  if (compact) {
    return (
      <>
        <div style={{ position: 'absolute', inset: 0, background: 'var(--grey-5)' }} />
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', padding: '14%', width: '100%', height: '100%', boxSizing: 'border-box' }}>
          {swatches.slice(0, 6).map((c, i) => (
            <span key={i} aria-hidden style={{ width: '100%', aspectRatio: '1/1', borderRadius: '50%', background: c, border: '1.5px solid var(--grey-0)', boxShadow: '0 0 0 1px var(--grey-20)' }} />
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'var(--grey-5)' }} />
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', padding: 'clamp(16px, 4vw, 32px)', boxSizing: 'border-box' }}>
        <div style={{ width: '46%', maxWidth: '200px', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ProductImage brand={product.brand} model={product.model} storage={product.storage} category={product.category} imageUrl={product.imageUrl} alt={`${product.model} — colour options`} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 2vw, 18px)' }}>
          {swatches.map((c, i) => (
            <span key={i} aria-hidden style={{ width: 'clamp(22px, 4vw, 34px)', height: 'clamp(22px, 4vw, 34px)', borderRadius: '50%', background: c, border: '2px solid var(--grey-0)', boxShadow: '0 2px 6px rgba(0,0,0,0.15), 0 0 0 1px var(--grey-20)' }} />
          ))}
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--grey-50)' }}>
          {swatches.length} finishes available
        </div>
      </div>
      <div style={{ position: 'absolute', top: '14px', right: '14px', padding: '3px 8px', background: 'var(--grey-0)', color: 'var(--grey-70)', border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-full)', fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Colours
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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', background: 'var(--grey-0)', border: '1px solid var(--grey-20)', borderRadius: 'var(--radius-full)', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, color: 'var(--grey-70)' }}>
      {children}
    </span>
  );
}
