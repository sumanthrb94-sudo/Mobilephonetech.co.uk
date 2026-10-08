import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, ProductVariant } from '../types';
import { useCatalogue } from '../context/CatalogueContext';
import { colourHex } from '../utils/deviceColors';
import {
  variantChoices, isChoosable, currentValue, currentValues, isAmbiguous, alternatives,
  type VariantOption,
} from '../lib/productSiblings';

/**
 * Colour, storage and condition — every option a real listing.
 *
 * This used to invent them. With no variant data on a product it derived a
 * storage ladder from whatever size was in stock (a 64GB became 64/128/256),
 * offered a hardcoded colour list per brand, and offered all four condition
 * grades. Choosing one produced a variant carrying the *base product's*
 * price and stock, so a shopper could order a 256GB at the price of a 64GB
 * that was the only thing for sale. The server re-prices every order from
 * the real product, so the takings were never wrong — the customer had
 * simply bought something that did not exist.
 *
 * This shop lists one product per physical configuration, which is right for
 * refurbished stock: each handset has its own price, grade and battery
 * health. So the other sizes are other products, and picking one navigates
 * to it. See src/lib/productSiblings.ts, which owns the grouping and is
 * where the guarantee lives that nothing offered here is fabricated.
 */

interface VariantSelectorProps {
  product: Product;
  onVariantSelect: (variant: ProductVariant) => void;
  selectedVariant: ProductVariant | null;
  onExplainGrading?: () => void;
}

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
  marginBottom: '6px',
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

const pillStyle = (selected: boolean): React.CSSProperties => ({
  height: '34px',
  padding: '0 14px',
  borderRadius: '999px',
  border: `1.5px solid ${selected ? 'var(--brand-cyan)' : 'var(--grey-20)'}`,
  background: selected ? 'var(--brand-cyan)' : 'var(--grey-0)',
  color: selected ? '#fff' : 'var(--black)',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
  fontSize: '13px',
  fontWeight: 600,
  whiteSpace: 'nowrap' as const,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  transition: 'border-color 0.15s, background 0.15s, color 0.15s',
});

/* The "depends what is on the shelf" line under an ambiguous attribute. */
const noteStyle: React.CSSProperties = {
  display: 'block',
  marginTop: '-2px',
  marginBottom: '2px',
  fontFamily: 'var(--font-body)',
  fontSize: '11.5px',
  lineHeight: 1.45,
  color: 'var(--grey-50)',
};

const priceHintStyle = (selected: boolean): React.CSSProperties => ({
  fontSize: '11.5px',
  fontWeight: 500,
  opacity: selected ? 0.85 : 0.65,
});

export default function VariantSelector({
  product,
  onVariantSelect,
  selectedVariant,
  onExplainGrading,
}: VariantSelectorProps) {
  const navigate = useNavigate();
  const { products: catalogue } = useCatalogue();

  const choices = useMemo(
    () => variantChoices(catalogue, product),
    [catalogue, product],
  );

  /**
   * The variant handed to the page is this product, not a composition of
   * whatever is selected. There is nothing to compose: the selection either
   * describes this listing or belongs to a different one, and choosing that
   * navigates rather than changing a price in place.
   */
  const own = useMemo<ProductVariant>(() => ({
    id: product.id,
    color: choices.colour.find(o => o.current)?.value,
    storage: choices.storage.find(o => o.current)?.value ?? product.storage,
    condition: product.grade,
    price: product.price,
    originalPrice: product.originalPrice,
    stock: product.stock,
    batteryHealth: product.batteryHealth,
    imageUrl: product.imageUrl,
  }), [product, choices]);

  React.useEffect(() => {
    if (product.variants?.length) return;
    if (selectedVariant?.id !== own.id) onVariantSelect(own);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [own.id, product.variants?.length]);

  // A model created in the new admin matrix has real, independently stocked
  // variants. Keep the shopper on this one product page and choose the exact
  // row; legacy one-configuration records continue through the sibling flow.
  // This branch comes after all hooks so switching a legacy model to variants
  // never changes the hook order.
  if (product.variants?.length) {
    return <MatrixSelector variants={product.variants} selectedVariant={selectedVariant} onVariantSelect={onVariantSelect} onExplainGrading={onExplainGrading} />;
  }

  const pick = (option: VariantOption) => {
    if (option.current) return;
    navigate(`/product/${option.productId}`);
  };

  const anything = choices.colour.length || choices.storage.length || choices.condition.length;
  if (!anything) return null;

  return (
    // 20px of gap, 20px of margin and 20px of padding, inside a buy column
    // that already spaces its children — three separate reasons for the same
    // blank band between Colour, Storage and Condition.
    <div className="pdp-variant-selector" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '4px', paddingTop: '14px', borderTop: '1px solid var(--grey-10)' }}>

      <Attribute
        label="Colour"
        options={choices.colour}
        ambiguousNote="This listing covers these colours — which one you receive depends on availability. Ask us before ordering if the colour matters."

        renderOption={(option) => (
          <button
            key={option.value}
            type="button"
            title={option.current ? option.value : `${option.value} — £${option.price}`}
            aria-label={option.current ? option.value : `${option.value}, £${option.price}`}
            aria-pressed={option.current}
            onClick={() => pick(option)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: option.current ? '2.5px solid var(--brand-cyan)' : '2px solid var(--grey-20)',
              background: colorSwatches[option.value] ?? option.value.toLowerCase(),
              cursor: option.current ? 'default' : 'pointer',
              padding: 0,
              outline: option.current ? '2px solid var(--brand-cyan)' : 'none',
              outlineOffset: '2px',
              flexShrink: 0,
              boxShadow: option.current ? '0 0 0 1px var(--brand-cyan)' : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          />
        )}
      />

      <Attribute
        label="Storage"
        options={choices.storage}
        ambiguousNote="This listing covers these sizes — subject to availability."

        renderOption={(option) => <Pill key={option.value} option={option} onPick={pick} />}
      />

      <Attribute
        label="Condition"
        options={choices.condition}
        ambiguousNote="This listing covers these grades — subject to availability."

        renderOption={(option) => <Pill key={option.value} option={option} onPick={pick} />}
      />
      <GradingHelp onOpen={onExplainGrading} />
    </div>
  );
}

function parseStorageSize(val?: string): number {
  if (!val) return 0;
  const match = val.match(/(\d+)\s*(GB|TB)/i);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  return match[2].toUpperCase() === 'TB' ? num * 1024 : num;
}

const CONDITION_RANK: Record<string, number> = {
  'Brand New': 1,
  'New': 2,
  'Like New': 3,
  'Pristine': 4,
  'Excellent': 5,
  'Good': 6,
  'Fair': 7,
};

function MatrixSelector({ variants, selectedVariant, onVariantSelect, onExplainGrading }: {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onVariantSelect: (variant: ProductVariant) => void;
  onExplainGrading?: () => void;
}) {
  // Extract unique attributes present in this variant set
  const colors = useMemo(() => {
    const set = new Set<string>();
    variants.forEach(v => { if (v.color) set.add(v.color.trim()); });
    return Array.from(set);
  }, [variants]);

  const storages = useMemo(() => {
    const set = new Set<string>();
    variants.forEach(v => { if (v.storage) set.add(v.storage.trim()); });
    return Array.from(set).sort((a, b) => parseStorageSize(a) - parseStorageSize(b));
  }, [variants]);

  const conditions = useMemo(() => {
    const set = new Set<string>();
    variants.forEach(v => { if (v.condition) set.add(v.condition.trim()); });
    return Array.from(set).sort((a, b) => (CONDITION_RANK[a] ?? 99) - (CONDITION_RANK[b] ?? 99));
  }, [variants]);

  // Active or defaulted variant
  const activeVariant = useMemo(() => {
    if (selectedVariant && variants.some(v => v.id === selectedVariant.id)) {
      return selectedVariant;
    }
    // Prefer first in-stock variant, otherwise cheapest variant
    const inStock = variants.find(v => v.stock > 0);
    return inStock ?? variants[0];
  }, [selectedVariant, variants]);

  // Synchronise initial default with parent if not already set
  React.useEffect(() => {
    if (activeVariant && (!selectedVariant || selectedVariant.id !== activeVariant.id)) {
      onVariantSelect(activeVariant);
    }
  }, [activeVariant, selectedVariant, onVariantSelect]);

  const activeColor = activeVariant?.color?.trim() || colors[0];
  const activeStorage = activeVariant?.storage?.trim() || storages[0];
  const activeCondition = activeVariant?.condition?.trim() || conditions[0];

  // Pick helper that selects the closest matching variant
  const handleSelectColor = (newColor: string) => {
    const exact = variants.find(v => v.color?.trim() === newColor && v.storage?.trim() === activeStorage && v.condition?.trim() === activeCondition);
    if (exact) { onVariantSelect(exact); return; }
    const sameStorage = variants.find(v => v.color?.trim() === newColor && v.storage?.trim() === activeStorage && v.stock > 0)
      ?? variants.find(v => v.color?.trim() === newColor && v.storage?.trim() === activeStorage);
    if (sameStorage) { onVariantSelect(sameStorage); return; }
    const anyInColor = variants.find(v => v.color?.trim() === newColor && v.stock > 0)
      ?? variants.find(v => v.color?.trim() === newColor);
    if (anyInColor) onVariantSelect(anyInColor);
  };

  const handleSelectStorage = (newStorage: string) => {
    const exact = variants.find(v => v.storage?.trim() === newStorage && v.color?.trim() === activeColor && v.condition?.trim() === activeCondition);
    if (exact) { onVariantSelect(exact); return; }
    const sameColor = variants.find(v => v.storage?.trim() === newStorage && v.color?.trim() === activeColor && v.stock > 0)
      ?? variants.find(v => v.storage?.trim() === newStorage && v.color?.trim() === activeColor);
    if (sameColor) { onVariantSelect(sameColor); return; }
    const anyInStorage = variants.find(v => v.storage?.trim() === newStorage && v.stock > 0)
      ?? variants.find(v => v.storage?.trim() === newStorage);
    if (anyInStorage) onVariantSelect(anyInStorage);
  };

  const handleSelectCondition = (newCondition: string) => {
    const exact = variants.find(v => v.condition?.trim() === newCondition && v.color?.trim() === activeColor && v.storage?.trim() === activeStorage);
    if (exact) { onVariantSelect(exact); return; }
    const sameStorage = variants.find(v => v.condition?.trim() === newCondition && v.storage?.trim() === activeStorage && v.stock > 0)
      ?? variants.find(v => v.condition?.trim() === newCondition && v.storage?.trim() === activeStorage);
    if (sameStorage) { onVariantSelect(sameStorage); return; }
    const anyInCondition = variants.find(v => v.condition?.trim() === newCondition && v.stock > 0)
      ?? variants.find(v => v.condition?.trim() === newCondition);
    if (anyInCondition) onVariantSelect(anyInCondition);
  };

  return (
    <div className="pdp-variant-selector" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--grey-10)' }}>
      {/* 1. Colour Row (Amazon Swatches) */}
      {colors.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={labelStyle}>
              Colour: <strong style={{ color: 'var(--black)', textTransform: 'none' }}>{activeColor}</strong>
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--grey-50)', fontWeight: 500 }}>
              {colors.length} finish{colors.length > 1 ? 'es' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {colors.map(color => {
              const isSelected = activeColor === color;
              // A finish recorded with its own swatch (catalogue imports carry
              // Apple's) wins over the shared palette, where one name such as
              // "Blue" covers several different Apple blues.
              const hex = variants.find(v => v.color?.trim() === color && v.colorHex)?.colorHex ?? colourHex(color);
              // Check if in stock in current storage or any storage
              const inStock = variants.some(v => v.color?.trim() === color && v.stock > 0);
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleSelectColor(color)}
                  title={`${color}${!inStock ? ' (Out of stock)' : ''}`}
                  aria-label={`${color}${isSelected ? ' (Selected)' : ''}`}
                  style={{
                    position: 'relative',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: hex,
                    border: isSelected ? '2.5px solid var(--brand-cyan)' : '2px solid rgba(0,0,0,0.12)',
                    boxShadow: isSelected ? '0 0 0 2px var(--brand-cyan)' : '0 1px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                    outline: 'none',
                    opacity: inStock ? 1 : 0.45,
                  }}
                >
                  {!inStock && (
                    <div style={{
                      position: 'absolute', top: '50%', left: 0, right: 0,
                      height: '1.5px', background: '#dc2626', transform: 'rotate(-45deg)'
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Storage Row (Segmented Pills with Prices)
          A single capacity is information, not a choice. Rendering that one
          value as a full-width button made 128GB look like a picker with
          missing options. As soon as the model has two or more genuine
          storage variants, each gets its own live price and stock state. */}
      {storages.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={labelStyle}>
              Capacity: <strong style={{ color: 'var(--black)', textTransform: 'none' }}>{activeStorage}</strong>
            </span>
          </div>
          {storages.length > 1 && (
            <div className="pdp-storage-options" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: '8px' }}>
              {storages.map(storage => {
              const isSelected = activeStorage === storage;
              // Find matching variant price for this storage
              const matching = variants.find(v => v.storage?.trim() === storage && v.color?.trim() === activeColor && v.condition?.trim() === activeCondition)
                ?? variants.find(v => v.storage?.trim() === storage && v.color?.trim() === activeColor)
                ?? variants.find(v => v.storage?.trim() === storage);
              const inStock = variants.some(v => v.storage?.trim() === storage && v.stock > 0);
              const price = matching?.price;

                return (
                  <button
                    key={storage}
                    type="button"
                    className="pdp-storage-choice"
                    onClick={() => handleSelectStorage(storage)}
                    aria-pressed={isSelected}
                    aria-label={`${storage}${price != null ? `, £${price}` : ''}${inStock ? '' : ', sold out'}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '62px',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: `1.5px solid ${isSelected ? 'var(--brand-cyan)' : 'var(--grey-20)'}`,
                      background: isSelected ? 'var(--color-brand-subtle)' : 'var(--grey-0)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                      opacity: inStock ? 1 : 0.6,
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: isSelected ? 'var(--brand-cyan)' : 'var(--black)',
                    }}>
                      {storage}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: inStock ? (isSelected ? 'var(--brand-cyan)' : 'var(--grey-50)') : '#dc2626',
                      marginTop: '2px',
                    }}>
                      {inStock && price != null ? `£${price}` : 'Sold out'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Condition / Grade Row */}
      {conditions.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={labelStyle}>
              Condition: <strong style={{ color: 'var(--black)', textTransform: 'none' }}>{activeCondition}</strong>
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(95px, 1fr))`, gap: '8px' }}>
            {conditions.map(condition => {
              const isSelected = activeCondition === condition;
              const matching = variants.find(v => v.condition?.trim() === condition && v.storage?.trim() === activeStorage && v.color?.trim() === activeColor)
                ?? variants.find(v => v.condition?.trim() === condition && v.storage?.trim() === activeStorage)
                ?? variants.find(v => v.condition?.trim() === condition);
              const inStock = (matching?.stock ?? 0) > 0;
              const price = matching?.price;

              return (
                  <button
                    key={condition}
                    type="button"
                    className="pdp-condition-choice"
                  onClick={() => handleSelectCondition(condition)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: `1.5px solid ${isSelected ? 'var(--brand-cyan)' : 'var(--grey-20)'}`,
                    background: isSelected ? 'var(--color-brand-subtle)' : 'var(--grey-0)',
                    cursor: inStock ? 'pointer' : 'default',
                    transition: 'border-color 0.15s, background 0.15s',
                    opacity: inStock ? 1 : 0.5,
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: isSelected ? 'var(--brand-cyan)' : 'var(--black)',
                  }}>
                    {condition}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: inStock ? (isSelected ? 'var(--brand-cyan)' : 'var(--grey-50)') : '#dc2626',
                    marginTop: '2px',
                  }}>
                    {inStock && price != null ? `£${price}` : 'Sold out'}
                  </span>
                </button>
              );
            })}
          </div>
          <GradingHelp onOpen={onExplainGrading} />
        </div>
      )}

      {/* 4. Active Selection Real-time Stock & Price Confirmation Box */}
      {activeVariant && (
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          background: 'var(--grey-5, #f8fafc)',
          border: '1px solid var(--grey-15, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, color: 'var(--black)' }}>
              {[activeVariant.storage, activeVariant.color, activeVariant.condition].filter(Boolean).join(' · ')}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {activeVariant.stock > 0 ? (
                <span style={{ color: activeVariant.stock <= 3 ? '#d97706' : '#16a34a', fontWeight: 600 }}>
                  {activeVariant.stock <= 3 ? `Only ${activeVariant.stock} left in stock` : `✓ In stock (${activeVariant.stock} available)`}
                </span>
              ) : (
                <span style={{ color: '#dc2626', fontWeight: 600 }}>Currently out of stock</span>
              )}
              {activeVariant.batteryHealth != null && (
                <span style={{ color: 'var(--grey-50)' }}>· {activeVariant.batteryHealth}% Battery</span>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '18px', fontWeight: 900, color: 'var(--black)' }}>
              £{activeVariant.price}
            </span>
            {activeVariant.originalPrice && activeVariant.originalPrice > activeVariant.price && (
              <span style={{ display: 'block', fontSize: '11px', color: 'var(--grey-40)', textDecoration: 'line-through' }}>
                £{activeVariant.originalPrice}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GradingHelp({ onOpen }: { onOpen?: () => void }) {
  if (!onOpen) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        alignSelf: 'flex-start',
        marginTop: '8px',
        padding: 0,
        border: 0,
        background: 'none',
        color: 'var(--brand-cyan-hover)',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontSize: '12px',
        fontWeight: 700,
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
      }}
    >
      What does each grade mean?
    </button>
  );
}


/**
 * One attribute row.
 *
 * Three shapes, decided by what the data actually supports:
 *
 *   - the listing has one value and no alternatives → plain text, because a
 *     choice of one is not a choice and a lone pressed button reads as
 *     though the others failed to load;
 *   - the listing has one value and siblings offer others → buttons, with
 *     each alternative's own price on it;
 *   - the listing declares several values of its own → those are listed as
 *     text with a note, because they are all the same product at the same
 *     price and buttons would be a row where everything is selected and
 *     nothing does anything. Any genuine alternatives still appear as
 *     buttons beneath.
 */
function Attribute({ label, options, renderOption, ambiguousNote }: {
  label: string;
  options: VariantOption[];
  renderOption: (option: VariantOption) => React.ReactNode;
  ambiguousNote?: string;
}) {
  if (options.length === 0) return null;

  const ambiguous = isAmbiguous(options);
  const mine = currentValues(options);
  const others = alternatives(options);

  // What the label says about this listing. Several values are joined
  // rather than one of them being picked arbitrarily to stand for the rest.
  const selected = ambiguous ? mine.join(', ') : currentValue(options);

  // Nothing to say and nothing to choose — the attribute does not apply to
  // this listing at all, so the row would be an empty heading.
  if (!selected && others.length === 0) return null;

  // When the listing is ambiguous about itself, only the alternatives are
  // buttons. Otherwise every option is, so the selected one shows as such.
  const buttons = ambiguous ? others : (isChoosable(options) ? options : []);

  return (
    <div>
      <label style={labelStyle}>
        {label}
        {selected && <span style={selectedValueStyle}>{selected}</span>}
      </label>
      {ambiguous && ambiguousNote && (
        <span style={noteStyle}>{ambiguousNote}</span>
      )}
      {buttons.length > 0 && <div style={rowStyle}>{buttons.map(renderOption)}</div>}
    </div>
  );
}

/**
 * A storage or condition pill.
 *
 * Options that lead elsewhere carry their own price, because that is the
 * thing the shopper is actually choosing between — and showing it is what
 * stops the page implying every size costs the same.
 */
function Pill({ option, onPick }: { option: VariantOption; onPick: (o: VariantOption) => void }) {
  return (
    <button
      type="button"
      aria-pressed={option.current}
      aria-label={option.current ? option.value : `${option.value}, £${option.price}`}
      onClick={() => onPick(option)}
      style={pillStyle(option.current)}
    >
      {option.value}
      {!option.current && <span style={priceHintStyle(false)}>£{option.price}</span>}
    </button>
  );
}
