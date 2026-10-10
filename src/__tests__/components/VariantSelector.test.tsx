import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import VariantSelector from '../../components/VariantSelector';
import type { Product, ProductVariant } from '../../types';

/**
 * The variant selector had no test before this, which is part of why it
 * could offer sizes that were never for sale.
 *
 * What is pinned here is the commercial guarantee: every option shown
 * belongs to a listing that exists, choosing one that belongs elsewhere
 * navigates to it rather than changing a price in place, and a size nobody
 * stocks is never offered at all.
 */

const navigate = vi.fn();
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

let catalogue: Product[] = [];
vi.mock('../../context/CatalogueContext', () => ({
  useCatalogue: () => ({ products: catalogue, fromSupabase: false, isLoading: false }),
}));

const product = (over: Partial<Product> & { id: string }): Product => ({
  brand: 'Apple', model: 'iPhone 8',
  price: 55, originalPrice: 99, stock: 2,
  grade: 'Excellent', category: 'Phones',
  imageUrl: '', galleryImages: [], isCertified: true,
  batteryHealth: 90, warrantyMonths: 12, returnDays: 30,
  specs: {} as Product['specs'],
  ...over,
} as Product);

const p64 = product({ id: 'iphone-8-64', storage: '64 GB', price: 55, colorOptions: ['Gold'] });
const p128 = product({ id: 'iphone-8-128', storage: '128 GB', price: 75, colorOptions: ['Black'] });

function renderFor(current: Product) {
  const onVariantSelect = vi.fn();
  render(
    <MemoryRouter>
      <VariantSelector product={current} onVariantSelect={onVariantSelect} selectedVariant={null} />
    </MemoryRouter>,
  );
  return { onVariantSelect };
}

beforeEach(() => {
  vi.clearAllMocks();
  catalogue = [p64, p128];
});

describe('VariantSelector', () => {
  it('offers the sizes that other listings actually have', () => {
    renderFor(p64);
    expect(screen.getByRole('button', { name: /128 GB, £75/ })).toBeTruthy();
  });

  /**
   * The bug this replaces. A 64GB listing used to offer 64/128/256 whether
   * or not those existed, and selling the invented one at the 64GB price.
   */
  it('offers nothing but the stocked size when there are no siblings', () => {
    catalogue = [p64];
    renderFor(p64);

    expect(screen.queryByRole('button', { name: /128 GB/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /256 GB/ })).toBeNull();
    // Shown as a label rather than a lone button.
    expect(screen.getByText('64 GB')).toBeTruthy();
  });

  it('shows each other size at its own price, not this one\'s', () => {
    renderFor(p64);
    const other = screen.getByRole('button', { name: /128 GB, £75/ });
    expect(other.textContent).toContain('£75');
    expect(other.textContent).not.toContain('£55');
  });

  it('navigates to the sibling product rather than repricing in place', async () => {
    renderFor(p64);
    await userEvent.click(screen.getByRole('button', { name: /128 GB, £75/ }));

    expect(navigate).toHaveBeenCalledWith('/product/iphone-8-128');
  });

  it('does not navigate when the current value is chosen again', async () => {
    renderFor(p64);
    await userEvent.click(screen.getByRole('button', { name: /^64 GB$/ }));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('hands the page this product, never a composed variant', () => {
    const { onVariantSelect } = renderFor(p64);

    expect(onVariantSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'iphone-8-64',
      price: 55,
      stock: 2,
      storage: '64 GB',
    }));
  });

  it('leaves a sold-out size out of the options', () => {
    catalogue = [p64, product({ id: 'iphone-8-256', storage: '256 GB', price: 95, stock: 0 })];
    renderFor(p64);

    expect(screen.queryByRole('button', { name: /256 GB/ })).toBeNull();
  });

  it('offers the colours other listings have, and navigates to them', async () => {
    renderFor(p64);
    await userEvent.click(screen.getByRole('button', { name: /Black, £75/ }));

    expect(navigate).toHaveBeenCalledWith('/product/iphone-8-128');
  });

  it('offers the grades that exist rather than all four', () => {
    catalogue = [p64, product({ id: 'iphone-8-good', grade: 'Good', price: 45, storage: '64 GB' })];
    renderFor(p64);

    expect(screen.getByRole('button', { name: /Good, £45/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Pristine/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Fair/ })).toBeNull();
  });

  it('renders nothing at all for a product with no attributes to show', () => {
    const bare = product({ id: 'bare', storage: undefined, grade: undefined as unknown as Product['grade'] });
    catalogue = [bare];
    const { container } = render(
      <MemoryRouter>
        <VariantSelector product={bare} onVariantSelect={vi.fn()} selectedVariant={null} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });
});

/**
 * A lone alternative belonging to another listing.
 *
 * Found by running this in a browser rather than by reasoning about it: the
 * 128 GB sibling was the only Black one in stock, and treating "one option"
 * as "not a choice" hid it entirely — while the row still labelled the
 * viewed product Black, which it was not.
 */
describe('VariantSelector — an attribute only a sibling has', () => {
  const plain = product({ id: 'iphone-8-64', storage: '64 GB', price: 55 });
  const black = product({ id: 'iphone-8-128', storage: '128 GB', price: 75, colorOptions: ['Black'] });

  beforeEach(() => { catalogue = [plain, black]; });

  it('offers the colour even though it is the only one', async () => {
    renderFor(plain);
    const swatch = screen.getByRole('button', { name: /Black, £75/ });

    await userEvent.click(swatch);
    expect(navigate).toHaveBeenCalledWith('/product/iphone-8-128');
  });

  it('does not label this product with a colour it has not got', () => {
    renderFor(plain);
    const colourRow = screen.getByText('Colour').closest('label');

    expect(colourRow?.textContent).toBe('Colour');
  });

  it('labels the colour once the product really has one', () => {
    renderFor(black);
    expect(screen.getByText('Colour').closest('label')?.textContent).toContain('Black');
  });
});

/**
 * A listing that declares several colours of its own.
 *
 * Those are not a choice: they are the same product at the same price with
 * the same stock, so rendering them as swatches produced a row where all
 * four were ringed as selected and none of them did anything. Clicking Red
 * changed nothing and the customer got whichever handset was on the shelf.
 *
 * The honest presentation is the list as text, plus a note saying so.
 */
describe('VariantSelector — a listing covering several colours', () => {
  const multi = product({
    id: 'apple-iphone-8', storage: '64 GB', price: 55,
    colorOptions: ['Gold', 'Black', 'Red', 'White'],
  });

  beforeEach(() => { catalogue = [multi]; });

  it('lists the colours as text rather than as buttons', () => {
    renderFor(multi);

    expect(screen.getByText('Colour').closest('label')?.textContent)
      .toBe('ColourGold, Black, Red, White');
    for (const c of ['Gold', 'Black', 'Red', 'White']) {
      expect(screen.queryByRole('button', { name: new RegExp(`^${c}`) })).toBeNull();
    }
  });

  it('says the colour depends on availability', () => {
    renderFor(multi);
    expect(screen.getByText(/depends on availability/i)).toBeTruthy();
  });

  it('never renders several swatches all marked selected', () => {
    renderFor(multi);
    const pressed = screen.queryAllByRole('button', { pressed: true });
    expect(pressed).toHaveLength(0);
  });

  /**
   * A genuine alternative is still a button, even beside an ambiguous list:
   * the sibling is a different product at a different price.
   */
  it('still offers a sibling colour as a real choice', async () => {
    const sibling = product({
      id: 'iphone-8-blue', storage: '64 GB', price: 65, colorOptions: ['Blue'],
    });
    catalogue = [multi, sibling];
    renderFor(multi);

    await userEvent.click(screen.getByRole('button', { name: /Blue, £65/ }));
    expect(navigate).toHaveBeenCalledWith('/product/iphone-8-blue');
  });

  it('applies the same treatment to a listing covering several sizes', () => {
    const sizes = product({
      id: 'multi-size', storage: '64 GB',
      storageOptions: ['64 GB', '128 GB'], colorOptions: ['Gold'],
    });
    catalogue = [sizes];
    renderFor(sizes);

    expect(screen.getByText('Storage').closest('label')?.textContent)
      .toBe('Storage64 GB, 128 GB');
    expect(screen.getByText(/sizes — subject to availability/i)).toBeTruthy();
  });
});

describe('VariantSelector — multi-variant matrix (Amazon style)', () => {
  const matrixProduct = product({
    id: 'iphone-17-pro',
    model: 'iPhone 17 Pro',
    variants: [
      { id: 'v1', storage: '256GB', color: 'Cosmic Orange', condition: 'Good',      price: 604, originalPrice: 604, stock: 8 },
      { id: 'v2', storage: '256GB', color: 'Cosmic Orange', condition: 'Excellent', price: 769, originalPrice: 769, stock: 8 },
      { id: 'v3', storage: '512GB', color: 'Cosmic Orange', condition: 'Good',      price: 714, originalPrice: 714, stock: 13 },
      { id: 'v4', storage: '512GB', color: 'Deep Blue',     condition: 'Good',      price: 714, originalPrice: 714, stock: 0 },
    ],
  });

  it('renders Amazon-style Colour, Capacity, and Condition pickers instead of a flat 36-item list', () => {
    renderFor(matrixProduct);
    // Should show segmented attributes
    expect(screen.getByText(/Colour:/i)).toBeTruthy();
    expect(screen.getByText(/Capacity:/i)).toBeTruthy();
    expect(screen.getByText(/Condition:/i)).toBeTruthy();
    // Swatches and pills
    expect(screen.getByRole('button', { name: /Cosmic Orange/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /256GB/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /512GB/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Good/i })).toBeTruthy();
  });

  it('auto-selects first in-stock variant and updates when clicking different storage', async () => {
    const { onVariantSelect } = renderFor(matrixProduct);
    expect(onVariantSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'v1',
      price: 604,
      storage: '256GB',
    }));

    await userEvent.click(screen.getByRole('button', { name: /512GB/i }));
    expect(onVariantSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'v3',
      storage: '512GB',
      price: 714,
    }));
  });

  it('shows a lone storage as information rather than a full-width choice', () => {
    const oneCapacity = product({
      id: 'ipad-11',
      model: 'iPad 11th Gen',
      variants: [
        { id: 'ipad-silver', storage: '128GB', color: 'Silver', condition: 'Pristine', price: 270, originalPrice: 270, stock: 3 },
        { id: 'ipad-blue', storage: '128GB', color: 'Blue', condition: 'Pristine', price: 270, originalPrice: 270, stock: 2 },
      ],
    });

    renderFor(oneCapacity);

    expect(screen.getByText(/Capacity:/i).textContent).toContain('128GB');
    expect(screen.queryByRole('button', { name: /128GB/i })).toBeNull();
  });
});

/**
 * Every grade, one under another.
 *
 * The shop owner asked for the whole grade ladder on the product page at
 * once: Pristine, Excellent and Good always listed, each priced for the
 * colour and capacity chosen above it, and a grade with none on the shelf
 * still shown but with no price. Fair is not sold and must never appear.
 */
describe('VariantSelector — every grade listed vertically', () => {
  const variants: ProductVariant[] = [
    { id: 'blk-128-p', color: 'Black', storage: '128GB', condition: 'Pristine',  price: 500, originalPrice: 900, stock: 2 },
    { id: 'blk-128-e', color: 'Black', storage: '128GB', condition: 'Excellent', price: 450, originalPrice: 900, stock: 3 },
    { id: 'blk-128-g', color: 'Black', storage: '128GB', condition: 'Good',      price: 400, originalPrice: 900, stock: 0 },
    { id: 'blk-128-f', color: 'Black', storage: '128GB', condition: 'Fair',      price: 300, originalPrice: 900, stock: 5 },
    { id: 'blk-256-p', color: 'Black', storage: '256GB', condition: 'Pristine',  price: 600, originalPrice: 1000, stock: 1 },
    { id: 'blk-256-g', color: 'Black', storage: '256GB', condition: 'Good',      price: 520, originalPrice: 1000, stock: 4 },
    { id: 'blk-256-g-cheap', color: 'Black', storage: '256GB', condition: 'Good', price: 510.5, originalPrice: 1000, stock: 2 },
    { id: 'blu-128-e', color: 'Blue',  storage: '128GB', condition: 'Excellent', price: 455, originalPrice: 900, stock: 1 },
    // Sold out, so the Blue Pristine row must say so rather than show £999.
    { id: 'blu-128-p', color: 'Blue',  storage: '128GB', condition: 'Pristine',  price: 999, originalPrice: 1200, stock: 0 },
  ];
  const matrix = product({ id: 'iphone-15', model: 'iPhone 15', variants });

  /** Feeds each choice back in, the way ProductDetail does. */
  function Harness({ onSelect, initial = null, onExplainGrading }: {
    onSelect: (v: ProductVariant) => void;
    initial?: ProductVariant | null;
    onExplainGrading?: () => void;
  }) {
    const [selected, setSelected] = useState<ProductVariant | null>(initial);
    return (
      <VariantSelector
        product={matrix}
        selectedVariant={selected}
        onVariantSelect={(v) => { onSelect(v); setSelected(v); }}
        onExplainGrading={onExplainGrading}
      />
    );
  }

  function renderMatrix(initial: ProductVariant | null = null, onExplainGrading?: () => void) {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <Harness onSelect={onSelect} initial={initial} onExplainGrading={onExplainGrading} />
      </MemoryRouter>,
    );
    return { onSelect };
  }

  const gradeList = () => screen.getByRole('group', { name: /condition/i });
  const gradeRow = (grade: string) =>
    within(gradeList()).getByRole('button', { name: new RegExp(`^${grade},`) });

  it('lists Pristine, Excellent and Good, in that order, one row each', () => {
    renderMatrix();
    const rows = within(gradeList()).getAllByRole('button');

    expect(rows.map(r => r.getAttribute('aria-label')?.split(',')[0])).toEqual(['Pristine', 'Excellent', 'Good']);
    expect(rows[0].textContent).toContain('Flawless, looks like new');
    expect(rows[1].textContent).toContain('Very light signs of use');
    expect(rows[2].textContent).toContain('Visible signs of everyday use');
  });

  it('still lists all three grades when a model only has one of them', () => {
    const onlyPristine = product({
      id: 'ipad-11',
      variants: [{ id: 'ipad-p', color: 'Silver', storage: '128GB', condition: 'Pristine', price: 270, originalPrice: 400, stock: 3 }],
    });
    render(
      <MemoryRouter>
        <VariantSelector product={onlyPristine} onVariantSelect={vi.fn()} selectedVariant={null} />
      </MemoryRouter>,
    );
    const rows = within(gradeList()).getAllByRole('button');

    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('£270');
    for (const row of rows.slice(1)) {
      expect(row.textContent).toContain('Out of stock');
      expect(row.textContent).not.toContain('£');
    }
  });

  it('shows an out-of-stock grade greyed, priceless and not selectable', async () => {
    const { onSelect } = renderMatrix();
    const good = gradeRow('Good');

    expect(good.textContent).toContain('Out of stock');
    expect(good.textContent).not.toContain('£');
    expect(good.getAttribute('aria-label')).not.toContain('£');
    expect(good.getAttribute('aria-disabled')).toBe('true');
    expect(good.getAttribute('aria-pressed')).toBe('false');

    onSelect.mockClear();
    await userEvent.click(good);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('prices each grade for the chosen colour and capacity', async () => {
    renderMatrix();
    // Black 128GB: the first in-stock unit is the default.
    expect(gradeRow('Pristine').textContent).toContain('£500');
    expect(gradeRow('Excellent').textContent).toContain('£450');
    expect(gradeRow('Good').textContent).toContain('Out of stock');

    // Black 256GB: Excellent is not stocked there, Good is — at its cheapest.
    await userEvent.click(screen.getByRole('button', { name: /^256GB/ }));
    expect(gradeRow('Pristine').textContent).toContain('£600');
    expect(gradeRow('Excellent').textContent).toContain('Out of stock');
    expect(gradeRow('Excellent').textContent).not.toContain('£');
    expect(gradeRow('Good').textContent).toContain('£510.50');

    // Blue (only 128GB in stock): only Excellent, and at Blue's own price.
    await userEvent.click(screen.getByRole('button', { name: /^Blue/ }));
    expect(gradeRow('Pristine').textContent).toContain('Out of stock');
    expect(gradeRow('Pristine').textContent).not.toContain('£999');
    expect(gradeRow('Excellent').textContent).toContain('£455');
    expect(gradeRow('Good').textContent).toContain('Out of stock');
  });

  it('selects the row\'s own unit when an in-stock grade is tapped', async () => {
    const { onSelect } = renderMatrix();
    expect(gradeRow('Pristine').getAttribute('aria-pressed')).toBe('true');

    await userEvent.click(gradeRow('Excellent'));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'blk-128-e', price: 450 }));
    expect(gradeRow('Excellent').getAttribute('aria-pressed')).toBe('true');
    expect(gradeRow('Pristine').getAttribute('aria-pressed')).toBe('false');

    // On 256GB, Good is the cheapest in-stock Good of that colour and size.
    await userEvent.click(screen.getByRole('button', { name: /^256GB/ }));
    await userEvent.click(gradeRow('Good'));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'blk-256-g-cheap' }));
  });

  it('can be chosen from the keyboard', async () => {
    const { onSelect } = renderMatrix();
    gradeRow('Excellent').focus();
    expect(document.activeElement).toBe(gradeRow('Excellent'));

    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'blk-128-e' }));
  });

  it('shows the saving against the dearest grade in stock, and only where real', () => {
    renderMatrix();
    expect(gradeRow('Excellent').textContent).toContain('Save £50 vs Pristine');
    expect(gradeRow('Pristine').textContent).not.toContain('Save');
    expect(gradeRow('Good').textContent).not.toContain('Save');
  });

  it('never shows Fair, even when a Fair unit is in stock or selected', () => {
    const fair = variants.find(v => v.condition === 'Fair')!;
    renderMatrix(fair);

    expect(screen.queryByText(/Fair/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Fair/ })).toBeNull();
    expect(screen.getByText(/^Condition/).textContent).toBe('Condition');
    // No grade claims to be the selected one.
    for (const row of within(gradeList()).getAllByRole('button')) {
      expect(row.getAttribute('aria-pressed')).toBe('false');
    }
  });

  it('opens the grading guide from the grade list', async () => {
    const explain = vi.fn();
    renderMatrix(null, explain);
    await userEvent.click(screen.getByRole('button', { name: /how grades work/i }));
    expect(explain).toHaveBeenCalled();
  });
});

describe('VariantSelector — colour swatches', () => {
  const hexToRgb = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
  };
  const swatch = (name: string) =>
    (screen.getByRole('button', { name: new RegExp(`^${name}`) }) as HTMLElement).style.background;

  const edge = (over: Partial<NonNullable<Product['variants']>[number]> = {}) => product({
    id: 'galaxy-s25-edge',
    brand: 'Samsung',
    model: 'Galaxy S25 Edge',
    variants: [
      { id: 'e1', storage: '256GB', color: 'Titanium Silver',    condition: 'Excellent', price: 500, originalPrice: 500, stock: 2 },
      { id: 'e2', storage: '256GB', color: 'Titanium Jet Black', condition: 'Excellent', price: 500, originalPrice: 500, stock: 2 },
      { id: 'e3', storage: '256GB', color: 'Titanium Icy Blue',  condition: 'Excellent', price: 500, originalPrice: 500, stock: 2, ...over },
    ],
  });

  /** All three used to paint the generic #888888. */
  it('paints each Galaxy S25 Edge finish its own colour', () => {
    renderFor(edge());
    const backgrounds = ['Titanium Silver', 'Titanium Jet Black', 'Titanium Icy Blue'].map(swatch);
    expect(new Set(backgrounds).size).toBe(3);
    expect(backgrounds).not.toContain(hexToRgb('#888888'));
    expect(swatch('Titanium Icy Blue')).toBe(hexToRgb('#adc8e2'));
  });

  it('does not let a stored placeholder grey override the colour the name gives', () => {
    renderFor(edge({ colorHex: '#888888' }));
    expect(swatch('Titanium Icy Blue')).toBe(hexToRgb('#adc8e2'));
  });

  it('still prefers a hex stored on purpose', () => {
    renderFor(edge({ colorHex: '#9fc0e0' }));
    expect(swatch('Titanium Icy Blue')).toBe(hexToRgb('#9fc0e0'));
  });
});

