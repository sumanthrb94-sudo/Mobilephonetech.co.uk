import React, { useMemo, useState, useEffect } from 'react';
import { Product, ProductVariant, ProductGrade } from '../types';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';

interface VariantSelectorProps {
  product: Product;
  onVariantSelect: (variant: ProductVariant) => void;
  selectedVariant: ProductVariant | null;
}

/**
 * VariantSelector — colour / storage / condition picker.
 *
 * Uses the product's real `variants[]` matrix when the catalogue has one;
 * otherwise synthesises sensible options from whatever fields the product
 * does expose (`colorOptions`, `storageOptions`, `conditionOptions`, or a
 * single `storage` / `grade`). If none are present, falls back to category
 * + brand defaults so every phone / tablet product still gets a picker.
 *
 * The tile UI (cyan-bordered selected state, Check chip, disabled-dim
 * fallback) is identical across data paths — shoppers can't tell which
 * product had a real matrix and which was derived.
 */

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

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--grey-60)',
  marginBottom: '12px',
  display: 'block',
};

const selectedValueStyle: React.CSSProperties = {
  color: 'var(--black)',
  marginLeft: '6px',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '13px',
  letterSpacing: 0,
};

function OptionTile({
  isSelected,
  isAvailable,
  onClick,
  children,
}: {
  isSelected: boolean;
  isAvailable: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => isAvailable && onClick()}
      disabled={!isAvailable}
      whileHover={isAvailable ? { scale: 1.02 } : undefined}
      whileTap={isAvailable ? { scale: 0.98 } : undefined}
      aria-pressed={isSelected}
      style={{
        position: 'relative',
        padding: '14px 12px',
        borderRadius: 'var(--radius-lg)',
        border: `2px solid ${isSelected ? 'var(--brand-cyan)' : isAvailable ? 'var(--grey-20)' : 'var(--grey-10)'}`,
        background: isSelected ? 'var(--color-brand-subtle)' : isAvailable ? 'var(--grey-0)' : 'var(--grey-5)',
        color: isAvailable ? 'var(--black)' : 'var(--grey-40)',
        cursor: isAvailable ? 'pointer' : 'not-allowed',
        opacity: isAvailable ? 1 : 0.5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        fontSize: '13px',
        transition: 'border-color var(--duration-fast), background var(--duration-fast)',
      }}
    >
      {children}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'var(--brand-cyan)',
            color: 'var(--grey-0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={14} />
        </motion.div>
      )}
    </motion.button>
  );
}

/**
 * Given a single storage string like "256 GB", synthesise a sensible
 * ladder of options the product would plausibly ship in.
 */
function deriveStorageLadder(single?: string): string[] {
  if (!single) return [];
  // specs.storage is often a compound string like "256GB storage, no microSD"
  // — pull the first capacity token we see.
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

/**
 * Category-level default storage ladder for products whose data doesn't
 * expose storage on the product or in specs. Covers every SKU type we
 * stock that reasonably has storage capacity.
 */
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

export default function VariantSelector({
  product,
  onVariantSelect,
  selectedVariant,
}: VariantSelectorProps) {
  const hasRealVariants = (product.variants ?? []).length > 0;

  // ── Option sources — real matrix first, then explicit arrays, then defaults
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

    // Try the top-level storage first, then any capacity token inside
    // specs.storage, then fall back to a category-level default ladder.
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

  // ── Local selection state (works even without a variants[] matrix)
  const [selColour, setSelColour]     = useState<string | undefined>(selectedVariant?.color ?? colourOptions[0]);
  const [selStorage, setSelStorage]   = useState<string | undefined>(selectedVariant?.storage ?? product.storage ?? storageOptions[0]);
  const [selCondition, setSelCondition] = useState<ProductGrade>((selectedVariant?.condition as ProductGrade | undefined) ?? product.grade ?? conditionOptions[0]);

  // Keep parent's selectedVariant in sync whenever local picks change
  useEffect(() => {
    if (hasRealVariants) {
      // Prefer an exact matrix match if one exists
      const match = (product.variants ?? []).find(
        (v) => v.color === selColour && v.storage === selStorage && v.condition === selCondition,
      );
      if (match) { onVariantSelect(match); return; }
    }
    // Otherwise synthesise a variant so downstream code (price, stock,
    // add-to-cart) still gets a concrete object to work with.
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

  // Don't render at all if we genuinely have zero options across all three axes
  if (colourOptions.length === 0 && storageOptions.length === 0 && conditionOptions.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-32)', marginBottom: 'var(--spacing-32)', paddingTop: 'var(--spacing-32)', borderTop: '1px solid var(--grey-10)' }}>
      {/* Colour */}
      {colourOptions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <label style={labelStyle}>
            Colour
            {selColour && <span style={selectedValueStyle}>{selColour}</span>}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {colourOptions.map((color) => (
              <OptionTile
                key={color}
                isSelected={selColour === color}
                isAvailable={true}
                onClick={() => setSelColour(color)}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid var(--grey-20)',
                    boxShadow: 'var(--shadow-sm)',
                    background: colorSwatches[color] ?? color.toLowerCase(),
                  }}
                />
                <span style={{ fontSize: '12px', textAlign: 'center', lineHeight: 1.3 }}>{color}</span>
              </OptionTile>
            ))}
          </div>
        </motion.div>
      )}

      {/* Storage */}
      {storageOptions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <label style={labelStyle}>
            Storage
            {selStorage && <span style={selectedValueStyle}>{selStorage}</span>}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {storageOptions.map((storage) => (
              <OptionTile
                key={storage}
                isSelected={selStorage === storage}
                isAvailable={true}
                onClick={() => setSelStorage(storage)}
              >
                <span style={{ fontSize: '15px', fontWeight: 700 }}>{storage}</span>
              </OptionTile>
            ))}
          </div>
        </motion.div>
      )}

      {/* Condition */}
      {conditionOptions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <label style={labelStyle}>
            Condition
            {selCondition && <span style={selectedValueStyle}>{selCondition}</span>}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {conditionOptions.map((condition) => (
              <OptionTile
                key={condition}
                isSelected={selCondition === condition}
                isAvailable={true}
                onClick={() => setSelCondition(condition)}
              >
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{condition}</span>
              </OptionTile>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
