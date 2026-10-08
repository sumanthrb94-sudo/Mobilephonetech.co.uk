import { RefreshCw } from 'lucide-react';

/**
 * Stands in for a product photo nobody has uploaded yet: the LeHart logo and
 * "Photo coming soon". It is deliberately the shop's own mark rather than a
 * stock picture or a drawn device, so staff can see at a glance which
 * products and colours still need photographing, and shoppers are never
 * shown a picture of a phone that is not the one they would receive.
 *
 * One SVG with a fixed viewBox, so it scales with whatever box it is given —
 * a 48px thumbnail or the product page hero — and, like the drawn devices it
 * replaces, still has an intrinsic size where its container sizes itself
 * from its content (the phone gallery does).
 */
export default function PhotoPending({ alt, compact = false }: { alt?: string; compact?: boolean }) {
  const label = alt ? `${alt}, photo coming soon` : 'Photo coming soon';
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={compact ? '0 0 100 100' : '0 0 200 200'}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', background: 'var(--grey-5)' }}
    >
      {compact ? (
        <>
          <rect x="22" y="22" width="56" height="56" rx="13" fill="var(--brand-cyan)" />
          <RefreshCw x={36} y={36} width={28} height={28} color="white" strokeWidth={2.5} aria-hidden="true" />
        </>
      ) : (
        <>
          <rect x="74" y="44" width="52" height="52" rx="12" fill="var(--brand-cyan)" />
          <RefreshCw x={87} y={57} width={26} height={26} color="white" strokeWidth={2.5} aria-hidden="true" />
          <text x="100" y="127" textAnchor="middle" fontFamily="var(--font-sans)" fontWeight="900" fontSize="21" letterSpacing="-0.8" fill="var(--grey-70)">
            Le<tspan fill="var(--brand-cyan)">Hart</tspan>
          </text>
          <text x="100" y="146" textAnchor="middle" fontFamily="var(--font-body)" fontWeight="600" fontSize="9.5" fill="var(--grey-50)">
            Photo coming soon
          </text>
        </>
      )}
    </svg>
  );
}
