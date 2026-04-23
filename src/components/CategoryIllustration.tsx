import React from 'react';

/**
 * CategoryIllustration — Claude-designed SVG per category.
 *
 * Consistent visual language: a soft cyan-subtle backdrop, a stylised
 * device silhouette in navy/grey, and a cyan accent that carries the
 * brand thread through every category card.
 *
 * Categories are matched by id (preferred) or by name (fallback) so it
 * works with the existing MOCK_CATEGORIES shape without needing any
 * schema changes.
 */

export type CategoryKey =
  | 'phones'
  | 'tablets'
  | 'accessories'
  | 'speakers'
  | 'hearables'
  | 'playables'
  | 'computing'
  | 'smartwatches'
  | 'default';

function resolveKey(idOrName: string): CategoryKey {
  const s = idOrName.toLowerCase();
  if (s.includes('phone') || s === 'apple' || s === 'samsung' || s === 'google') return 'phones';
  if (s.includes('tab') || s.includes('ipad')) return 'tablets';
  if (s.includes('accessor')) return 'accessories';
  if (s.includes('speak')) return 'speakers';
  if (s.includes('hear') || s.includes('head') || s.includes('audio') || s.includes('bud')) return 'hearables';
  if (s.includes('play') || s.includes('gam') || s.includes('console')) return 'playables';
  if (s.includes('comput') || s.includes('laptop') || s.includes('mac')) return 'computing';
  if (s.includes('watch')) return 'smartwatches';
  return 'default';
}

export default function CategoryIllustration({
  category,
  rounded = true,
  maxHeight,
}: {
  category: string;
  rounded?: boolean;
  maxHeight?: number | string;
}) {
  const key = resolveKey(category);
  const Art = ART[key];
  return (
    <div
      aria-hidden
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, var(--color-brand-subtle) 0%, var(--grey-5) 100%)',
        borderRadius: rounded ? 'var(--radius-lg)' : undefined,
        overflow: 'hidden',
      }}
    >
      <svg
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: '100%',
          maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
          display: 'block',
        }}
      >
        <Art />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SVG art pieces. All use tokenised fills so they respond if we ever
// re-enable dark mode.
// ─────────────────────────────────────────────────────────────────────

const ART: Record<CategoryKey, React.FC> = {
  phones: PhonesArt,
  tablets: TabletsArt,
  accessories: AccessoriesArt,
  speakers: SpeakersArt,
  hearables: HearablesArt,
  playables: PlayablesArt,
  computing: ComputingArt,
  smartwatches: SmartwatchArt,
  default: DefaultArt,
};

const NAVY = 'var(--brand-header)';
const CYAN = 'var(--brand-cyan)';
const SHADOW = 'rgba(0,0,0,0.12)';

function GroundShadow({ cx = 100, w = 100, y = 170 }: { cx?: number; w?: number; y?: number }) {
  return <ellipse cx={cx} cy={y} rx={w / 2} ry={5} fill={SHADOW} />;
}

function PhonesArt() {
  return (
    <g>
      <GroundShadow cx={100} w={80} y={172} />
      {/* back phone */}
      <rect x="72" y="40" width="58" height="118" rx="12" fill={NAVY} />
      <rect x="76" y="44" width="50" height="110" rx="8" fill="#1f2d62" />
      {/* front phone */}
      <rect x="58" y="52" width="62" height="122" rx="13" fill="#fff" stroke="var(--grey-20)" />
      <rect x="62" y="58" width="54" height="108" rx="8" fill={NAVY} />
      {/* dynamic island */}
      <rect x="80" y="62" width="18" height="5" rx="2.5" fill="#000" />
      {/* cyan accent notification */}
      <circle cx="105" cy="162" r="5" fill={CYAN} />
    </g>
  );
}

function TabletsArt() {
  return (
    <g>
      <GroundShadow cx={100} w={130} y={172} />
      <rect x="32" y="36" width="136" height="118" rx="10" fill={NAVY} />
      <rect x="38" y="42" width="124" height="106" rx="6" fill="#1a2a5e" />
      {/* on-screen cyan pixels */}
      <rect x="46" y="50" width="30" height="24" rx="3" fill={CYAN} opacity="0.65" />
      <rect x="80" y="50" width="30" height="24" rx="3" fill="#fff" opacity="0.08" />
      <rect x="114" y="50" width="42" height="24" rx="3" fill="#fff" opacity="0.08" />
      <rect x="46" y="78" width="110" height="8" rx="2" fill="#fff" opacity="0.06" />
      <rect x="46" y="90" width="90" height="8" rx="2" fill="#fff" opacity="0.06" />
      <rect x="46" y="102" width="60" height="8" rx="2" fill="#fff" opacity="0.06" />
      <rect x="46" y="118" width="40" height="20" rx="3" fill={CYAN} opacity="0.85" />
    </g>
  );
}

function AccessoriesArt() {
  return (
    <g>
      <GroundShadow cx={100} w={90} y={172} />
      {/* charger brick */}
      <rect x="60" y="60" width="50" height="50" rx="10" fill="#fff" stroke="var(--grey-20)" />
      <rect x="78" y="52" width="14" height="10" rx="2" fill={NAVY} />
      <rect x="82" y="46" width="3" height="8" fill={NAVY} />
      <rect x="87" y="46" width="3" height="8" fill={NAVY} />
      {/* usb-c cable winding out */}
      <path d="M110 85 C 140 85, 140 130, 100 130 S 60 150, 90 158"
        stroke={NAVY} strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="86" y="152" width="10" height="14" rx="2" fill={CYAN} />
    </g>
  );
}

function SpeakersArt() {
  return (
    <g>
      <GroundShadow cx={100} w={80} y={172} />
      <rect x="64" y="40" width="72" height="124" rx="16" fill={NAVY} />
      {/* mesh dots */}
      {Array.from({ length: 5 }).map((_, r) =>
        Array.from({ length: 5 }).map((_, c) => (
          <circle key={`${r}-${c}`} cx={78 + c * 11} cy={60 + r * 14} r={2.6} fill="#fff" opacity="0.35" />
        ))
      )}
      <circle cx="100" cy="138" r="8" fill={CYAN} />
      <circle cx="100" cy="138" r="3" fill="#fff" />
    </g>
  );
}

function HearablesArt() {
  return (
    <g>
      <GroundShadow cx={100} w={110} y={172} />
      {/* Case */}
      <rect x="66" y="96" width="68" height="40" rx="10" fill="#fff" stroke="var(--grey-20)" />
      <circle cx="100" cy="116" r="3" fill={CYAN} />
      {/* Left bud */}
      <g transform="translate(56 52)">
        <circle cx="0" cy="20" r="18" fill="#fff" stroke="var(--grey-20)" />
        <path d="M-4 14 q-14 8 -6 26 q4 8 14 2 Z" fill="#fff" stroke="var(--grey-20)" />
        <circle cx="-2" cy="20" r="4" fill={NAVY} />
      </g>
      {/* Right bud */}
      <g transform="translate(144 52)">
        <circle cx="0" cy="20" r="18" fill="#fff" stroke="var(--grey-20)" />
        <path d="M4 14 q14 8 6 26 q-4 8 -14 2 Z" fill="#fff" stroke="var(--grey-20)" />
        <circle cx="2" cy="20" r="4" fill={NAVY} />
      </g>
    </g>
  );
}

function PlayablesArt() {
  return (
    <g>
      <GroundShadow cx={100} w={140} y={172} />
      {/* Controller body */}
      <path d="M38 96 Q 40 64 72 64 L 128 64 Q 160 64 162 96 Q 164 134 134 134 L 118 134 L 100 150 L 82 134 L 66 134 Q 36 134 38 96 Z" fill={NAVY} />
      {/* d-pad */}
      <rect x="58" y="92" width="22" height="6" rx="1.5" fill="#fff" opacity="0.8" />
      <rect x="66" y="84" width="6" height="22" rx="1.5" fill="#fff" opacity="0.8" />
      {/* buttons */}
      <circle cx="128" cy="90" r="4" fill={CYAN} />
      <circle cx="140" cy="100" r="4" fill="#fff" opacity="0.8" />
      <circle cx="128" cy="110" r="4" fill="#fff" opacity="0.8" />
      <circle cx="116" cy="100" r="4" fill="#fff" opacity="0.8" />
    </g>
  );
}

function ComputingArt() {
  return (
    <g>
      <GroundShadow cx={100} w={140} y={172} />
      {/* laptop body */}
      <path d="M40 140 L 50 70 Q 52 62 60 62 L 140 62 Q 148 62 150 70 L 160 140 Z" fill={NAVY} />
      {/* screen */}
      <rect x="56" y="70" width="88" height="60" rx="3" fill="#1a2a5e" />
      <rect x="60" y="74" width="80" height="52" rx="2" fill={CYAN} opacity="0.28" />
      {/* base */}
      <rect x="34" y="140" width="132" height="10" rx="5" fill={NAVY} />
      <rect x="86" y="140" width="28" height="3" rx="1.5" fill="#0a0f2b" />
    </g>
  );
}

function SmartwatchArt() {
  return (
    <g>
      <GroundShadow cx={100} w={80} y={172} />
      {/* Strap top */}
      <rect x="88" y="24" width="24" height="44" rx="4" fill={NAVY} />
      {/* Strap bottom */}
      <rect x="88" y="132" width="24" height="44" rx="4" fill={NAVY} />
      {/* Body */}
      <rect x="64" y="62" width="72" height="76" rx="16" fill="#fff" stroke="var(--grey-20)" />
      <rect x="70" y="68" width="60" height="64" rx="12" fill={NAVY} />
      {/* face */}
      <text x="100" y="104" fontFamily="DM Sans, sans-serif" fontSize="18" fontWeight="800" fill="#fff" textAnchor="middle">09:41</text>
      <circle cx="100" cy="120" r="2.5" fill={CYAN} />
      {/* crown */}
      <rect x="136" y="92" width="4" height="14" rx="2" fill={NAVY} />
    </g>
  );
}

function DefaultArt() {
  return (
    <g>
      <GroundShadow cx={100} w={80} y={172} />
      <rect x="70" y="56" width="60" height="100" rx="10" fill={NAVY} />
      <rect x="74" y="62" width="52" height="88" rx="6" fill="#1a2a5e" />
      <circle cx="100" cy="144" r="5" fill={CYAN} />
    </g>
  );
}
