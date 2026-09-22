import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, ProductVariant } from '../types';
import { useCatalogue } from '../context/CatalogueContext';
import { variantChoices, isChoosable, currentValue, type VariantOption } from '../lib/productSiblings';

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
    if (selectedVariant?.id !== own.id) onVariantSelect(own);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [own.id]);

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
        renderOption={(option) => <Pill key={option.value} option={option} onPick={pick} />}
      />

      <Attribute
        label="Condition"
        options={choices.condition}
        renderOption={(option) => <Pill key={option.value} option={option} onPick={pick} />}
      />
    </div>
  );
}

/**
 * One attribute row.
 *
 * A single option is shown as text rather than as a lone pressed button: a
 * choice of one is not a choice, and a row containing exactly one selected
 * pill reads as though the others failed to load.
 */
function Attribute({ label, options, renderOption }: {
  label: string;
  options: VariantOption[];
  renderOption: (option: VariantOption) => React.ReactNode;
}) {
  if (options.length === 0) return null;

  const selected = currentValue(options);
  const choosable = isChoosable(options);

  // Nothing to say and nothing to choose — the attribute does not apply to
  // this listing at all, so the row would be an empty heading.
  if (!selected && !choosable) return null;

  return (
    <div>
      <label style={labelStyle}>
        {label}
        {selected && <span style={selectedValueStyle}>{selected}</span>}
      </label>
      {choosable && <div style={rowStyle}>{options.map(renderOption)}</div>}
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
