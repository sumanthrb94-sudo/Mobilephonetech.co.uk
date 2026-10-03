import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, ProductVariant } from '../types';
import { useCatalogue } from '../context/CatalogueContext';
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
    return <MatrixSelector variants={product.variants} selectedVariant={selectedVariant} onVariantSelect={onVariantSelect} />;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '4px', paddingTop: '14px', borderTop: '1px solid var(--grey-10)' }}>

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
    </div>
  );
}

function MatrixSelector({ variants, selectedVariant, onVariantSelect }: {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onVariantSelect: (variant: ProductVariant) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '14px', borderTop: '1px solid var(--grey-10)' }}>
      <label style={labelStyle}>Choose your configuration</label>
      <div style={{ display: 'grid', gap: '8px' }}>
        {variants.map(variant => {
          const selected = selectedVariant?.id === variant.id;
          const available = variant.stock > 0;
          const label = [variant.storage, variant.color, variant.connectivity, variant.condition].filter(Boolean).join(' · ') || 'Standard configuration';
          return (
            <button
              key={variant.id}
              type="button"
              disabled={!available}
              aria-pressed={selected}
              onClick={() => onVariantSelect(variant)}
              style={{
                display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', textAlign: 'left',
                padding: '11px 12px', borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${selected ? 'var(--brand-cyan)' : 'var(--grey-20)'}`,
                background: selected ? 'var(--color-brand-subtle)' : 'var(--grey-0)',
                color: available ? 'var(--black)' : 'var(--grey-50)',
                cursor: available ? 'pointer' : 'not-allowed', opacity: available ? 1 : .58,
                fontFamily: 'var(--font-body)', fontSize: 13,
              }}
            >
              <span><strong style={{ fontFamily: 'var(--font-sans)' }}>{label}</strong>{variant.batteryHealth != null && <span style={{ display: 'block', marginTop: 3, fontSize: 12 }}>Battery health {variant.batteryHealth}%</span>}</span>
              <span style={{ textAlign: 'right', whiteSpace: 'nowrap', fontFamily: 'var(--font-sans)', fontWeight: 800 }}>£{variant.price}{available ? <small style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 500, color: 'var(--grey-50)' }}>{variant.stock} available</small> : <small style={{ display: 'block', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Sold out</small>}</span>
            </button>
          );
        })}
      </div>
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
