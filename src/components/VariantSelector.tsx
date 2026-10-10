import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, ProductVariant } from '../types';
import { useCatalogue } from '../context/CatalogueContext';
import { colourHex, storedSwatch } from '../utils/deviceColors';
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
              // Not the name as CSS: "Titanium Icy Blue" is not a CSS colour,
              // so the circle drew empty.
              background: colorSwatches[option.value] ?? colourHex(option.value),
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

/**
 * The grades this shop sells, best first. Every one is always listed, in
 * stock or not, so a shopper sees the whole ladder at once. Fair is not sold
 * and never appears, even if a stray variant carries it.
 */
const SHOP_GRADES = ['Pristine', 'Excellent', 'Good'] as const;
type ShopGrade = typeof SHOP_GRADES[number];

/** One line per grade, in the words GradeExplainer uses at length. */
const GRADE_LINE: Record<ShopGrade, string> = {
  Pristine: 'Flawless, looks like new',
  Excellent: 'Very light signs of use',
  Good: 'Visible signs of everyday use',
};

/** Whole pounds as £270 and pennies as £270.50, as AnimatedPrice shows them. */
function money(value: number): string {
  const pence = Math.round(value * 100);
  return pence % 100 === 0 ? `£${pence / 100}` : `£${(pence / 100).toFixed(2)}`;
}

const trimmed = (value?: string) => (value ?? '').trim();

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
  const activeCondition = activeVariant?.condition?.trim();

  /**
   * One row per sellable grade for the colour and capacity on screen.
   *
   * A row's price is the cheapest in-stock unit of that exact colour,
   * capacity and grade — never a unit in another colour or size, which would
   * put a price on the row that tapping it cannot deliver. The selected unit
   * speaks for its own grade so the row always agrees with the page price,
   * and a tablet keeps its Wi-Fi or Cellular radio when one is in stock.
   * A grade with nothing on the shelf has no offer and so no price.
   */
  const gradeRows = useMemo(() => {
    const colour = trimmed(activeVariant?.color);
    const storage = trimmed(activeVariant?.storage);
    const radio = trimmed(activeVariant?.connectivity);

    return SHOP_GRADES.map(grade => {
      if (activeVariant && activeVariant.stock > 0 && trimmed(activeVariant.condition) === grade) {
        return { grade, offer: activeVariant };
      }
      const onShelf = variants.filter(v =>
        v.stock > 0
        && trimmed(v.condition) === grade
        && trimmed(v.color) === colour
        && trimmed(v.storage) === storage);
      const sameRadio = onShelf.filter(v => trimmed(v.connectivity) === radio);
      const pool = sameRadio.length ? sameRadio : onShelf;
      const offer = pool.reduce<ProductVariant | undefined>(
        (best, v) => (!best || v.price < best.price ? v : best), undefined);
      return { grade, offer };
    });
  }, [variants, activeVariant]);

  // "Save £X" is measured against the dearest grade actually on offer for
  // this colour and capacity, and only shown where there is a real gap.
  const dearest = gradeRows.reduce<{ grade: ShopGrade; price: number } | null>(
    (top, row) => (row.offer && (!top || row.offer.price > top.price)
      ? { grade: row.grade, price: row.offer.price }
      : top),
    null);

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

  // Only an in-stock row has an offer, so an out-of-stock grade can never be
  // chosen, by tap or by keyboard.
  const handleSelectGrade = (offer: ProductVariant | undefined) => {
    if (!offer || offer.id === activeVariant?.id) return;
    onVariantSelect(offer);
  };

  const shownGrade = SHOP_GRADES.find(g => g === activeCondition);
  const gradeLabelId = React.useId();

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
              // "Blue" covers several different Apple blues. A stored
              // placeholder grey does not: the name says more than that.
              const hex = storedSwatch(variants, color) ?? colourHex(color);
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

      {/* 3. Condition — every grade, one under another.
          All three are always listed so the shopper can compare them at a
          glance, each priced for the colour and capacity chosen above. A
          grade with none on the shelf stays in the list, greyed, with no
          price: "Out of stock" says it exists and is not available now. */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
          <span id={gradeLabelId} style={{ ...labelStyle, marginBottom: 0 }}>
            Condition{shownGrade && <>: <strong style={{ color: 'var(--black)', textTransform: 'none' }}>{shownGrade}</strong></>}
          </span>
          {onExplainGrading && (
            <button
              type="button"
              onClick={onExplainGrading}
              style={{
                padding: 0,
                background: 'none',
                border: 0,
                color: 'var(--brand-cyan-hover)',
                fontFamily: 'var(--font-sans)',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'underline',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              How grades work
            </button>
          )}
        </div>
        <div
          className="pdp-grade-list"
          role="group"
          aria-labelledby={gradeLabelId}
          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          {gradeRows.map(({ grade, offer }) => {
            const isSelected = shownGrade === grade;
            const inStock = Boolean(offer);
            const saving = offer && dearest && dearest.grade !== grade
              ? Math.round((dearest.price - offer.price) * 100) / 100
              : 0;
            const label = [
              grade,
              GRADE_LINE[grade],
              offer ? money(offer.price) : 'out of stock',
              saving > 0 && dearest ? `save ${money(saving)} compared with ${dearest.grade}` : '',
            ].filter(Boolean).join(', ');

            return (
              <button
                key={grade}
                type="button"
                className="pdp-grade-choice"
                aria-pressed={isSelected}
                aria-disabled={!inStock || undefined}
                aria-label={label}
                onClick={() => handleSelectGrade(offer)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  minWidth: 0,
                  minHeight: '58px',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${isSelected ? 'var(--brand-cyan)' : 'var(--grey-20)'}`,
                  background: isSelected ? 'var(--color-brand-subtle)' : 'var(--grey-0)',
                  textAlign: 'left',
                  cursor: !inStock ? 'not-allowed' : isSelected ? 'default' : 'pointer',
                  opacity: inStock ? 1 : 0.55,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                {/* A radio mark, so the choice reads without relying on colour. */}
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    boxSizing: 'border-box',
                    border: `2px solid ${isSelected ? 'var(--brand-cyan)' : 'var(--grey-30)'}`,
                    background: isSelected ? 'radial-gradient(circle, var(--brand-cyan) 0 4px, transparent 4.5px)' : 'var(--grey-0)',
                  }}
                />
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: isSelected ? 'var(--brand-cyan-hover)' : 'var(--black)',
                  }}>
                    {grade}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    lineHeight: 1.35,
                    color: 'var(--grey-60)',
                  }}>
                    {GRADE_LINE[grade]}
                  </span>
                </span>
                <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', textAlign: 'right' }}>
                  {offer ? (
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 800, color: 'var(--black)' }}>
                      {money(offer.price)}
                    </span>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 700, color: 'var(--grey-50)' }}>
                      Out of stock
                    </span>
                  )}
                  {saving > 0 && (
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: 'var(--color-trust-text)' }}>
                      Save {money(saving)} vs {dearest?.grade}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* No confirmation box: it restated the grade, price, stock and
          battery that the page already shows once each. */}
    </div>
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
