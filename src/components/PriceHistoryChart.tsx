import React from 'react';

/**
 * PriceHistoryChart — 90-day line chart + "lowest in 90 days" trust cue.
 * Renders an inline SVG (no chart library), shares brand-cyan stroke + grey
 * token fills, and stays legible at the mobile width of ProductDetail.
 *
 * Data is deterministically synthesised from the product id so the same
 * product shows a stable trend run-to-run. Swap the `buildSeries` function
 * for a real feed when the pricing service is available.
 */
export default function PriceHistoryChart({ productId, currentPrice }: { productId: string; currentPrice: number }) {
  const series = buildSeries(productId, currentPrice);
  const { min, max } = series.reduce(
    (acc, v) => ({ min: Math.min(acc.min, v), max: Math.max(acc.max, v) }),
    { min: Infinity, max: -Infinity },
  );
  const width = 320;
  const height = 120;
  const paddingX = 6;
  const paddingY = 12;
  const span = max - min || 1;
  const step = (width - paddingX * 2) / (series.length - 1);
  const pts = series.map((v, i) => {
    const x = paddingX + i * step;
    const y = paddingY + (height - paddingY * 2) * (1 - (v - min) / span);
    return { x, y };
  });
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaD = `${d} L ${pts[pts.length - 1].x.toFixed(1)} ${height - paddingY} L ${pts[0].x.toFixed(1)} ${height - paddingY} Z`;
  const isLowest = currentPrice <= min + 0.5;

  return (
    <div style={{ border: '1px solid var(--grey-10)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', background: 'var(--grey-0)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--grey-50)',
          }}
        >
          90-day price
        </span>
        {isLowest && (
          <span className="badge" style={{ background: 'var(--green-5)', color: 'var(--color-trust-text)', border: '1px solid var(--green-20)' }}>
            Lowest in 90 days
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Price history over the last 90 days"
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id="price-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-cyan)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--brand-cyan)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#price-area)" />
        <path d={d} fill="none" stroke="var(--brand-cyan-hover)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={4} fill="var(--brand-cyan-hover)" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--grey-50)' }}>
        <span>Low £{Math.floor(min)}</span>
        <span>Today £{currentPrice}</span>
        <span>High £{Math.ceil(max)}</span>
      </div>
    </div>
  );
}

function buildSeries(seed: string, anchor: number): number[] {
  const rng = mulberry32(hash(seed));
  const len = 30; // 30 points across 90 days
  const series: number[] = [];
  let v = anchor * (0.98 + rng() * 0.18); // start a bit above current
  for (let i = 0; i < len - 1; i++) {
    const drift = (rng() - 0.48) * (anchor * 0.04);
    v = Math.max(anchor * 0.85, v + drift);
    series.push(Math.round(v));
  }
  series.push(anchor);
  return series;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
