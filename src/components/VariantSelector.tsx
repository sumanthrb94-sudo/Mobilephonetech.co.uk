import React, { useMemo, useState, useEffect } from 'react';
import { Product, ProductVariant, ProductGrade } from '../types';

interface VariantSelectorProps {
  product: Product;
  onVariantSelect: (variant: ProductVariant) => void;
  selectedVariant: ProductVariant | null;
}

const DEFAULT_GRADES: ProductGrade[] = ['Pristine', 'Excellent', 'Good', 'Fair'];

const BRAND_COLOUR_DEFAULTS: Record<string, string[]> = {
  Apple:    ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
  Samsung:  ['Phantom Black', 'Phantom White', 'Lavender', 'Cream'],
  Google:   ['Obsidian', 'Snow', 'Hazel', 'Bay'],
  OnePlus:  ['Flowy Emerald', 'Silky Black', 'Dune Gold'],
  Motorola: ['Viva Magenta', 'Interstellar Black', 'Neptune Green'],
};

const colorSwatches: Record<string, string> = {
  'Natural Titanium': '#C0C0C0',
  'Blue Titanium':    '#4A90E2',
  'White Titanium':   '#F5F5F5',
  'Black Titanium':   '#1A1A1A',
  'Space Black':      '#0D0D0D',
  'Silver':           '#E8E8E8',
  'Gold':             '#FFD700',
  'Pacific Blue':     '#0066CC',
  'Midnight':         '#1A1A2E',
  'Starlight':        '#F0E68C',
  'Blue':             '#4A90E2',
  'Phantom Black':    '#0D0D0D',
  'Phantom White':    '#F5F5F5',
  'Lavender':         '#C8A2C8',
  'Cream':            '#F5E6D3',
  'Obsidian':         '#1F1F22',
  'Snow':             '#FFFFFF',
  'Hazel':            '#A6907A',
  'Bay':              '#9DB3BF',
  'Flowy Emerald':    '#2E8B57',
  'Silky Black':      '#141414',
  'Dune Gold':        '#BFA78A',
  'Viva Magenta':     '#B33A72',
  'Interstellar Black': '#1A1A1A',
  'Neptune Green':    '#3F6E57',
};

function deriveStorageLadder(single?: string): string[] {
  if (!single) return [];
  const m = single.match(/(\d+)\s*(GB|TB)/i);
  if (!m) return [];
  const val = parseInt(m[1], 10);
  const unit = m[2].toUpperCase();
  if (unit === 'TB') return ['512 GB', '1 TB', '2 TB'];
  if (val <= 64)  return ['64 GB', '128 GB', '256 GB'];
  if (val <= 128) return ['128 GB', '256 GB', '512 GB'];
  if (val <= 256) return ['128 GB', '256 GB', '512 GB', '1 TB'];
  if (val <= 512) return ['256 GB', '512 GB', '1 TB'];
  return ['512 GB', '1 TB', '2 TB'];
}

function defaultLadderForCategory(category?: string, model?: string): string[] {
  const c = (category || '').toLowerCase();
  const m = (model || '').toLowerCase();
  if (c === 'phones' || c === 'apple' || c === 'samsung' || c === 'google')
    return ['128 GB', '256 GB', '512 GB', '1 TB'];
  if (c === 'tablets' || c === 'ipads & tabs' || m.includes('ipad') || m.includes('tab'))
    return ['64 GB', '128 GB', '256 GB', '512 GB'];
  if (c === 'computing' || m.includes('macbook') || m.includes('laptop'))
    return ['256 GB', '512 GB', '1 TB', '2 TB'];
  if (c === 'playables' || c === 'gaming' || m.includes('ps5') || m.includes('xbox'))
    return ['500 GB', '1 TB', '2 TB'];
  return [];
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: 'var(--grey-60)',
  marginBottom: '8px',
  display: 'block',
};

const selectedValueStyle: React.CSSProperties = {
  color: 'var(--black)',
  marginLeft: '6px',
  textTransform: 'none' as const,
  fontWeight: 600,
  fontSize: '12px',
  letterSpacing: 0,
};

export default function VariantSelector({
  product,
  onVariantSelect,
  selectedVariant,
}: VariantSelectorProps) {
  const hasRealVariants = (product.variants ?? []).length > 0;

  const colourOptions = useMemo<string[]>(() => {
    if (hasRealVariants) {
      return Array.from(new Set((product.variants ?? []).map((v) => v.color).filter(Boolean) as string[]));
    }
    if (product.colorOptions && product.colorOptions.length > 0) return product.colorOptions;
    return BRAND_COLOUR_DEFAULTS[product.brand] ?? ['Black', 'White', 'Blue'];
  }, [product, hasRealVariants]);

  const storageOptions = useMemo<string[]>(() => {
    if (hasRealVariants) {
      return Array.from(new Set((product.variants ?? []).map((v) => v.storage).filter(Boolean) as string[]));
    }
    if (product.storageOptions && product.storageOptions.length > 0) return product.storageOptions;
    const fromTopLevel = deriveStorageLadder(product.storage);
    if (fromTopLevel.length > 0) return fromTopLevel;
    const fromSpecs = deriveStorageLadder(product.specs?.storage);
    if (fromSpecs.length > 0) return fromSpecs;
    return defaultLadderForCategory(product.category, product.model);
  }, [product, hasRealVariants]);

  const conditionOptions = useMemo<ProductGrade[]>(() => {
    if (hasRealVariants) {
      return Array.from(new Set((product.variants ?? []).map((v) => v.condition).filter(Boolean) as ProductGrade[]));
    }
    if (product.conditionOptions && product.conditionOptions.length > 0) return product.conditionOptions;
    return DEFAULT_GRADES;
  }, [product, hasRealVariants]);

  const [selColour, setSelColour]       = useState<string | undefined>(selectedVariant?.color ?? colourOptions[0]);
  const [selStorage, setSelStorage]     = useState<string | undefined>(selectedVariant?.storage ?? product.storage ?? storageOptions[0]);
  const [selCondition, setSelCondition] = useState<ProductGrade>((selectedVariant?.condition as ProductGrade | undefined) ?? product.grade ?? conditionOptions[0]);

  useEffect(() => {
    if (hasRealVariants) {
      const match = (product.variants ?? []).find(
        (v) => v.color === selColour && v.storage === selStorage && v.condition === selCondition,
      );
      if (match) { onVariantSelect(match); return; }
    }
    onVariantSelect({
      id: `${product.id}-${selColour}-${selStorage}-${selCondition}`.replace(/\s+/g, '-').toLowerCase(),
      color: selColour,
      storage: selStorage,
      condition: selCondition,
      price: product.price,
      originalPrice: product.originalPrice,
      stock: product.stock,
      batteryHealth: product.batteryHealth,
      imageUrl: product.imageUrl,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selColour, selStorage, selCondition]);

  if (colourOptions.length === 0 && storageOptions.length === 0 && conditionOptions.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px', paddingTop: '20px', borderTop: '1px solid var(--grey-10)' }}>

      {/* Colour — circle swatches */}
      {colourOptions.length > 0 && (
        <div>
          <label style={labelStyle}>
            Colour
            {selColour && <span style={selectedValueStyle}>{selColour}</span>}
          </label>
          <div style={rowStyle}>
            {colourOptions.map((color) => {
              const isSelected = selColour === color;
              const bg = colorSwatches[color] ?? color.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                  title={color}
                  aria-pressed={isSelected}
                  onClick={() => setSelColour(color)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: isSelected ? '2.5px solid var(--brand-cyan)' : '2px solid var(--grey-20)',
                    background: bg,
                    cursor: 'pointer',
                    padding: 0,
                    outline: isSelected ? '2px solid var(--brand-cyan)' : 'none',
                    outlineOffset: '2px',
                    flexShrink: 0,
                    boxShadow: isSelected ? '0 0 0 1px var(--brand-cyan)' : 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Storage — compact pills */}
      {storageOptions.length > 0 && (
        <div>
          <label style={labelStyle}>
            Storage
            {selStorage && <span style={selectedValueStyle}>{selStorage}</span>}
          </label>
          <div style={rowStyle}>
            {storageOptions.map((storage) => {
              const isSelected = selStorage === storage;
              return (
                <button
                  key={storage}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelStorage(storage)}
                  style={{
                    height: '34px',
                    padding: '0 14px',
                    borderRadius: '999px',
                    border: `1.5px solid ${isSelected ? 'var(--brand-cyan)' : 'var(--grey-20)'}`,
                    background: isSelected ? 'var(--brand-cyan)' : 'var(--grey-0)',
                    color: isSelected ? '#fff' : 'var(--black)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '13px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap' as const,
                    transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                  }}
                >
                  {storage}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Condition — compact pills */}
      {conditionOptions.length > 0 && (
        <div>
          <label style={labelStyle}>
            Condition
            {selCondition && <span style={selectedValueStyle}>{selCondition}</span>}
          </label>
          <div style={rowStyle}>
            {conditionOptions.map((condition) => {
              const isSelected = selCondition === condition;
              return (
                <button
                  key={condition}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelCondition(condition)}
                  style={{
                    height: '34px',
                    padding: '0 14px',
                    borderRadius: '999px',
                    border: `1.5px solid ${isSelected ? 'var(--brand-cyan)' : 'var(--grey-20)'}`,
                    background: isSelected ? 'var(--brand-cyan)' : 'var(--grey-0)',
                    color: isSelected ? '#fff' : 'var(--black)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '13px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap' as const,
                    transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                  }}
                >
                  {condition}
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
