import { useState } from 'react';
import CategoryIllustration from './CategoryIllustration';

/**
 * BrandLogoPlaceholder — renders the official brand logo on a tinted
 * background when no real product photograph is available. Uses the
 * simpleicons.org CDN (https://cdn.simpleicons.org/{slug}/{hex}) so
 * every logo is the vendor's exact SVG, not a knockoff. If the CDN
 * is unreachable or the slug is unknown the <img> onError flips to
 * the CategoryIllustration fallback so the card never shows a broken
 * image glyph.
 */

interface BrandStyle {
  slug: string;
  logoHex: string;
  bgFrom: string;
  bgTo: string;
  textColor: string;
}

const BRANDS: Record<string, BrandStyle> = {
  apple:     { slug: 'apple',     logoHex: '1a1a1a', bgFrom: '#f5f5f7', bgTo: '#e8e8ed', textColor: '#1a1a1a' },
  samsung:   { slug: 'samsung',   logoHex: '1428a0', bgFrom: '#eef3ff', bgTo: '#dbe5ff', textColor: '#0b1f5c' },
  google:    { slug: 'google',    logoHex: '4285f4', bgFrom: '#f0f6ff', bgTo: '#dce8fb', textColor: '#1a2b4a' },
  oneplus:   { slug: 'oneplus',   logoHex: 'f50514', bgFrom: '#fff1f1', bgTo: '#ffd9d9', textColor: '#6b0012' },
  motorola:  { slug: 'motorola',  logoHex: 'e1251b', bgFrom: '#fff4f0', bgTo: '#ffe0d6', textColor: '#5a1608' },
  sony:      { slug: 'sony',      logoHex: '000000', bgFrom: '#f1f3f5', bgTo: '#dee2e6', textColor: '#1a1a1a' },
  microsoft: { slug: 'microsoft', logoHex: '0078d4', bgFrom: '#ecf4fc', bgTo: '#d6e6f7', textColor: '#07294d' },
  nintendo:  { slug: 'nintendo',  logoHex: 'e60012', bgFrom: '#fff0f1', bgTo: '#ffd6d9', textColor: '#6c0008' },
  meta:      { slug: 'meta',      logoHex: '0064e0', bgFrom: '#eaf2ff', bgTo: '#cfdffc', textColor: '#0b2b59' },
  xiaomi:    { slug: 'xiaomi',    logoHex: 'ff6900', bgFrom: '#fff5eb', bgTo: '#ffe1c2', textColor: '#5a2c00' },
  huawei:    { slug: 'huawei',    logoHex: 'ff0000', bgFrom: '#fff0f0', bgTo: '#ffd4d4', textColor: '#5a0000' },
  nothing:   { slug: 'nothing',   logoHex: 'db3a37', bgFrom: '#fdf1f0', bgTo: '#f7d6d4', textColor: '#4a0f0d' },
  default:   { slug: 'apple',     logoHex: '6b7280', bgFrom: '#f5f5f7', bgTo: '#e8e8ed', textColor: '#374151' },
};

function lookupBrand(brand: string): BrandStyle {
  return BRANDS[brand.trim().toLowerCase()] ?? BRANDS.default;
}

export default function BrandLogoPlaceholder({
  brand,
  model,
  category,
  alt,
}: {
  brand: string;
  model: string;
  category?: string;
  alt?: string;
}) {
  const b = lookupBrand(brand);
  const [logoFailed, setLogoFailed] = useState(false);
  const logoUrl = `https://cdn.simpleicons.org/${b.slug}/${b.logoHex}`;

  if (logoFailed) {
    return (
      <div aria-label={alt ?? `${brand} ${model}`} style={{ width: '100%', height: '100%' }}>
        <CategoryIllustration category={category || 'phones'} rounded={false} />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={alt ?? `${brand} ${model}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10%',
        padding: '14%',
        background: `linear-gradient(135deg, ${b.bgFrom} 0%, ${b.bgTo} 100%)`,
        boxSizing: 'border-box',
      }}
    >
      <img
        src={logoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setLogoFailed(true)}
        style={{ width: '46%', height: '46%', objectFit: 'contain' }}
      />
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 'clamp(10px, 1.6cqw, 13px)',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: b.textColor,
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: '92%',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {model}
      </div>
    </div>
  );
}
