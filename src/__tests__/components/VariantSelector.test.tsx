import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import VariantSelector from '../../components/VariantSelector';
import { gradeOffer } from '../../lib/gradeOffers';
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

/** Feeds each choice back in, the way ProductDetail does. */
function SelectionHarness({ product: current, onSelect, initial = null, onExplainGrading }: {
  product: Product;
  onSelect: (v: ProductVariant) => void;
  initial?: ProductVariant | null;
  onExplainGrading?: () => void;
}) {
  const [selected, setSelected] = useState<ProductVariant | null>(initial);
  return (
    <VariantSelector
      product={current}
      selectedVariant={selected}
      onVariantSelect={(v) => { onSelect(v); setSelected(v); }}
      onExplainGrading={onExplainGrading}
    />
  );
}

function renderSelection(current: Product, initial: ProductVariant | null = null) {
  const onSelect = vi.fn();
  render(
    <MemoryRouter>
      <SelectionHarness product={current} onSelect={onSelect} initial={initial} />
    </MemoryRouter>,
  );
  return { onSelect };
}

const gradeList = () => screen.getByRole('group', { name: /condition/i });
const gradeRow = (grade: string) =>
  within(gradeList()).getByRole('button', { name: new RegExp(`^${grade},`) });
const gradeNames = () =>
  within(gradeList()).getAllByRole('button').map(r => r.getAttribute('aria-label')?.split(',')[0]);
const conditionLabel = () => screen.getByText(/^Condition/).textContent;

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
 * still shown but with no price. New and Fair appear only for a model that
 * actually carries them (see the next block).
 */
describe('VariantSelector — every grade listed vertically', () => {
  const variants: ProductVariant[] = [
    { id: 'blk-128-p', color: 'Black', storage: '128GB', condition: 'Pristine',  price: 500, originalPrice: 900, stock: 2 },
    { id: 'blk-128-e', color: 'Black', storage: '128GB', condition: 'Excellent', price: 450, originalPrice: 900, stock: 3 },
    { id: 'blk-128-g', color: 'Black', storage: '128GB', condition: 'Good',      price: 400, originalPrice: 900, stock: 0 },
    { id: 'blk-256-p', color: 'Black', storage: '256GB', condition: 'Pristine',  price: 600, originalPrice: 1000, stock: 1 },
    { id: 'blk-256-g', color: 'Black', storage: '256GB', condition: 'Good',      price: 520, originalPrice: 1000, stock: 4 },
    { id: 'blk-256-g-cheap', color: 'Black', storage: '256GB', condition: 'Good', price: 510.5, originalPrice: 1000, stock: 2 },
    { id: 'blu-128-e', color: 'Blue',  storage: '128GB', condition: 'Excellent', price: 455, originalPrice: 900, stock: 1 },
    // Sold out, so the Blue Pristine row must say so rather than show £999.
    { id: 'blu-128-p', color: 'Blue',  storage: '128GB', condition: 'Pristine',  price: 999, originalPrice: 1200, stock: 0 },
  ];
  const matrix = product({ id: 'iphone-15', model: 'iPhone 15', variants });

  function renderMatrix(initial: ProductVariant | null = null, onExplainGrading?: () => void) {
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <SelectionHarness product={matrix} onSelect={onSelect} initial={initial} onExplainGrading={onExplainGrading} />
      </MemoryRouter>,
    );
    return { onSelect };
  }

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

  it('does not list Fair or New for a model that has no such unit', () => {
    renderMatrix();

    expect(screen.queryByText(/Fair/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Fair/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^New,/ })).toBeNull();
    expect(screen.getByText(/^Condition/).textContent).toBe('Condition: Pristine');
  });

  it('lists Fair last, priced and selectable, for a model that has a Fair unit', async () => {
    const withFair = [
      ...variants,
      { id: 'blk-128-f', color: 'Black', storage: '128GB', condition: 'Fair', price: 300, originalPrice: 900, stock: 5 } as ProductVariant,
    ];
    const onSelect = vi.fn();
    render(
      <MemoryRouter>
        <SelectionHarness product={product({ id: 'iphone-15-fair', variants: withFair })} onSelect={onSelect} />
      </MemoryRouter>,
    );
    const rows = within(gradeList()).getAllByRole('button');

    expect(rows.map(r => r.getAttribute('aria-label')?.split(',')[0])).toEqual(['Pristine', 'Excellent', 'Good', 'Fair']);
    expect(gradeRow('Fair').textContent).toContain('Noticeable signs of use, fully working');
    expect(gradeRow('Fair').textContent).toContain('£300');

    await userEvent.click(gradeRow('Fair'));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'blk-128-f' }));
    expect(gradeRow('Fair').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/^Condition/).textContent).toBe('Condition: Fair');
  });

  it('opens the grading guide from the grade list', async () => {
    const explain = vi.fn();
    renderMatrix(null, explain);
    await userEvent.click(screen.getByRole('button', { name: /how grades work/i }));
    expect(explain).toHaveBeenCalled();
  });
});

/**
 * New and Fair units.
 *
 * The grade list used to hold only Pristine, Excellent and Good. A model
 * whose unit for sale was New (iPhone 17, listed first at £854) or Fair
 * (Galaxy A52s, one unit at £75) then had no row for it: the Condition label
 * was blank and all three rows could read "Out of stock" while the page sold
 * the unit. New now leads the list and Fair ends it, whenever the model has
 * one.
 */
describe('VariantSelector — New and Fair grades', () => {
  const iphone17 = product({
    id: 'apple-iphone-17',
    model: 'iPhone 17',
    variants: [
      { id: 'i17-new', color: 'Lavender', storage: '256GB', condition: 'New',       price: 854, originalPrice: 899, stock: 1 },
      { id: 'i17-p',   color: 'Lavender', storage: '256GB', condition: 'Pristine',  price: 720, originalPrice: 899, stock: 2 },
      { id: 'i17-e',   color: 'Lavender', storage: '256GB', condition: 'Excellent', price: 680, originalPrice: 899, stock: 2 },
    ],
  });

  it('lists New first, selected with its own price, when the model has a new unit', () => {
    renderSelection(iphone17);

    expect(gradeNames()).toEqual(['New', 'Pristine', 'Excellent', 'Good']);
    expect(gradeRow('New').textContent).toContain('Brand new, unused');
    expect(gradeRow('New').textContent).toContain('£854');
    expect(gradeRow('New').getAttribute('aria-pressed')).toBe('true');
    expect(conditionLabel()).toBe('Condition: New');
    // The refurbished grades compare against it honestly.
    expect(gradeRow('Pristine').textContent).toContain('Save £134 vs New');
  });

  it('lets the shopper choose New from another grade, and back', async () => {
    const { onSelect } = renderSelection(iphone17, iphone17.variants![1]);
    expect(gradeRow('Pristine').getAttribute('aria-pressed')).toBe('true');

    await userEvent.click(gradeRow('New'));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'i17-new', price: 854 }));
    expect(gradeRow('New').getAttribute('aria-pressed')).toBe('true');
    expect(conditionLabel()).toBe('Condition: New');

    await userEvent.click(gradeRow('Excellent'));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'i17-e' }));
  });

  it('shows a Fair-only model\'s unit as the selected Fair row, the standard grades out of stock', () => {
    const a52s = product({
      id: 'samsung-galaxy-a52s-5g-128gb',
      brand: 'Samsung',
      model: 'Galaxy A52s 5G',
      variants: [
        { id: 'a52s-fair', color: 'Awesome Black', storage: '128GB', condition: 'Fair', price: 75, originalPrice: 399, stock: 1 },
      ],
    });
    const { onSelect } = renderSelection(a52s);

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'a52s-fair' }));
    expect(gradeNames()).toEqual(['Pristine', 'Excellent', 'Good', 'Fair']);
    expect(conditionLabel()).toBe('Condition: Fair');

    const fair = gradeRow('Fair');
    expect(fair.getAttribute('aria-pressed')).toBe('true');
    expect(fair.textContent).toContain('£75');
    expect(fair.getAttribute('aria-disabled')).toBeNull();

    for (const grade of ['Pristine', 'Excellent', 'Good']) {
      expect(gradeRow(grade).textContent).toContain('Out of stock');
      expect(gradeRow(grade).textContent).not.toContain('£');
      expect(gradeRow(grade).getAttribute('aria-pressed')).toBe('false');
    }
  });
});

/**
 * A selected unit that is sold out.
 *
 * Its row is the selected one, so it must say "Out of stock" and carry no
 * price. It used to borrow the price of another unit of the same grade (a
 * Cellular tablet beside a sold-out Wi-Fi one), which the page was not
 * selling.
 */
describe('VariantSelector — a sold-out selected unit', () => {
  const ipad = product({
    id: 'ipad-air',
    model: 'iPad Air',
    variants: [
      { id: 'wifi-p-oos', color: 'Silver', storage: '256GB', connectivity: 'Wi-Fi',    condition: 'Pristine', price: 450, originalPrice: 700, stock: 0 },
      { id: 'cell-p',     color: 'Silver', storage: '256GB', connectivity: 'Cellular', condition: 'Pristine', price: 560, originalPrice: 800, stock: 1 },
      { id: 'wifi-g',     color: 'Silver', storage: '256GB', connectivity: 'Wi-Fi',    condition: 'Good',     price: 380, originalPrice: 700, stock: 2 },
    ],
  });

  it('marks its row selected and out of stock, with no price at all', async () => {
    const { onSelect } = renderSelection(ipad, ipad.variants![0]);
    const pristine = gradeRow('Pristine');

    expect(conditionLabel()).toBe('Condition: Pristine');
    expect(pristine.getAttribute('aria-pressed')).toBe('true');
    expect(pristine.textContent).toContain('Out of stock');
    expect(pristine.textContent).not.toContain('£');
    expect(pristine.getAttribute('aria-label')).not.toContain('£');

    // Nothing to choose on that row; the other grades still work.
    onSelect.mockClear();
    await userEvent.click(pristine);
    expect(onSelect).not.toHaveBeenCalled();
    expect(gradeRow('Good').textContent).toContain('£380');
  });
});

/**
 * Changing colour or capacity keeps the grade, and lands on a unit that can
 * be bought: in stock on the same radio first, then in stock on the other,
 * and a sold-out unit only when there is nothing else in that grade.
 */
describe('VariantSelector — switching colour or capacity', () => {
  const ipad = product({
    id: 'ipad-11',
    model: 'iPad 11th Gen',
    variants: [
      { id: 's-128-wifi-p',     color: 'Silver', storage: '128GB', connectivity: 'Wi-Fi',    condition: 'Pristine', price: 400, originalPrice: 600, stock: 2 },
      // Listed first and cheapest, but sold out.
      { id: 'b-128-wifi-p-oos', color: 'Blue',   storage: '128GB', connectivity: 'Wi-Fi',    condition: 'Pristine', price: 390, originalPrice: 600, stock: 0 },
      { id: 'b-128-cell-p',     color: 'Blue',   storage: '128GB', connectivity: 'Cellular', condition: 'Pristine', price: 520, originalPrice: 700, stock: 1 },
      { id: 'b-128-wifi-p',     color: 'Blue',   storage: '128GB', connectivity: 'Wi-Fi',    condition: 'Pristine', price: 410, originalPrice: 600, stock: 3 },
      // 256GB Pristine: only Cellular is in stock.
      { id: 's-256-wifi-p-oos', color: 'Silver', storage: '256GB', connectivity: 'Wi-Fi',    condition: 'Pristine', price: 450, originalPrice: 700, stock: 0 },
      { id: 's-256-cell-p',     color: 'Silver', storage: '256GB', connectivity: 'Cellular', condition: 'Pristine', price: 560, originalPrice: 800, stock: 1 },
      // Gold Pristine exists but is sold out; Gold Good is in stock.
      { id: 'g-128-wifi-p-oos', color: 'Gold',   storage: '128GB', connectivity: 'Wi-Fi',    condition: 'Pristine', price: 395, originalPrice: 600, stock: 0 },
      { id: 'g-128-wifi-g',     color: 'Gold',   storage: '128GB', connectivity: 'Wi-Fi',    condition: 'Good',     price: 300, originalPrice: 600, stock: 2 },
    ],
  });

  it('prefers an in-stock unit on the same radio over a sold-out exact match', async () => {
    const { onSelect } = renderSelection(ipad);
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 's-128-wifi-p' }));

    await userEvent.click(screen.getByRole('button', { name: /^Blue/ }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'b-128-wifi-p', price: 410 }));
    expect(gradeRow('Pristine').textContent).toContain('£410');
    expect(gradeRow('Pristine').getAttribute('aria-pressed')).toBe('true');
  });

  it('takes the in-stock unit on the other radio before a sold-out one on this radio', async () => {
    const { onSelect } = renderSelection(ipad);

    await userEvent.click(screen.getByRole('button', { name: /^256GB/ }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 's-256-cell-p' }));
    expect(gradeRow('Pristine').textContent).toContain('£560');
  });

  it('lands on the sold-out unit only when that grade has nothing in stock, and says so', async () => {
    const { onSelect } = renderSelection(ipad);

    await userEvent.click(screen.getByRole('button', { name: /^Gold/ }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'g-128-wifi-p-oos' }));
    expect(gradeRow('Pristine').getAttribute('aria-pressed')).toBe('true');
    expect(gradeRow('Pristine').textContent).toContain('Out of stock');
    expect(gradeRow('Pristine').textContent).not.toContain('£');
    expect(gradeRow('Good').textContent).toContain('£300');
  });
});

/**
 * Tablets come as Wi-Fi or Cellular, and a grade row must not switch radio
 * without saying so, nor count the Cellular premium as a saving.
 */
describe('VariantSelector — tablet connectivity in the grade list', () => {
  const variants: ProductVariant[] = [
    { id: 'wifi-p',     color: 'Silver', storage: '128GB', connectivity: 'Wi-Fi',    condition: 'Pristine',  price: 400, originalPrice: 600, stock: 2 },
    { id: 'cell-p',     color: 'Silver', storage: '128GB', connectivity: 'Cellular', condition: 'Pristine',  price: 500, originalPrice: 700, stock: 2 },
    { id: 'wifi-e-oos', color: 'Silver', storage: '128GB', connectivity: 'Wi-Fi',    condition: 'Excellent', price: 330, originalPrice: 600, stock: 0 },
    { id: 'cell-e',     color: 'Silver', storage: '128GB', connectivity: 'Cellular', condition: 'Excellent', price: 380, originalPrice: 700, stock: 1 },
    { id: 'wifi-g',     color: 'Silver', storage: '128GB', connectivity: 'Wi-Fi',    condition: 'Good',      price: 300, originalPrice: 600, stock: 3 },
    // Cheaper, but on the other radio.
    { id: 'cell-g',     color: 'Silver', storage: '128GB', connectivity: 'Cellular', condition: 'Good',      price: 280, originalPrice: 700, stock: 3 },
  ];
  const ipad = product({ id: 'ipad-mini', model: 'iPad mini', variants });

  it('offers each grade on the selected radio, and names the radio when it cannot', () => {
    renderSelection(ipad);

    // Good: the Wi-Fi unit, not the cheaper Cellular one.
    expect(gradeRow('Good').textContent).toContain('£300');
    expect(gradeRow('Good').textContent).not.toContain('£280');
    expect(gradeRow('Good').textContent).not.toContain('Cellular');

    // Excellent: no Wi-Fi in stock, so Cellular, labelled as such.
    const excellent = gradeRow('Excellent');
    expect(excellent.textContent).toContain('£380');
    expect(excellent.textContent).toContain('Cellular');
    expect(excellent.getAttribute('aria-label')).toContain('Cellular');

    expect(gradeRow('Pristine').textContent).not.toContain('Cellular');
    expect(gradeRow('Pristine').textContent).not.toContain('Wi-Fi');
  });

  it('measures "Save" only against a unit on the same radio', () => {
    renderSelection(ipad);

    // Dearest is Pristine Wi-Fi at £400: Good Wi-Fi really is £100 less...
    expect(gradeRow('Good').textContent).toContain('Save £100 vs Pristine');
    // ...but Excellent is a Cellular unit, so no saving is claimed.
    expect(gradeRow('Excellent').textContent).not.toContain('Save');
  });

  it('skips the saving when the dearest offer is on the other radio', () => {
    const onlyCellularPristine = product({
      id: 'ipad-mini-2',
      model: 'iPad mini',
      variants: [
        { id: 'wifi-e', color: 'Silver', storage: '128GB', connectivity: 'Wi-Fi',    condition: 'Excellent', price: 330, originalPrice: 600, stock: 1 },
        { id: 'cell-p', color: 'Silver', storage: '128GB', connectivity: 'Cellular', condition: 'Pristine',  price: 500, originalPrice: 700, stock: 1 },
        { id: 'wifi-g', color: 'Silver', storage: '128GB', connectivity: 'Wi-Fi',    condition: 'Good',      price: 300, originalPrice: 600, stock: 1 },
      ],
    });
    renderSelection(onlyCellularPristine);

    expect(gradeRow('Pristine').textContent).toContain('Cellular');
    // Without the radio check these read "Save £170" and "Save £200 vs Pristine".
    for (const grade of ['Pristine', 'Excellent', 'Good']) {
      expect(gradeRow(grade).textContent).not.toContain('Save');
    }
  });

  it('switches radio when the labelled row is chosen, and then labels nothing', async () => {
    const { onSelect } = renderSelection(ipad);

    await userEvent.click(gradeRow('Excellent'));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'cell-e' }));
    // Now on Cellular, every grade is offered on Cellular.
    expect(gradeRow('Pristine').textContent).toContain('£500');
    expect(gradeRow('Good').textContent).toContain('£280');
    for (const grade of ['Pristine', 'Excellent', 'Good']) {
      expect(gradeRow(grade).textContent).not.toMatch(/Wi-Fi|Cellular/);
    }
  });

  /**
   * ProductDetail's grade comparison selects through gradeOffer too, so a
   * grade chosen there is always the unit this row shows.
   */
  it('offers on every row exactly the unit gradeOffer picks for that grade', async () => {
    const { onSelect } = renderSelection(ipad);
    const active = onSelect.mock.lastCall![0] as ProductVariant;

    for (const grade of ['Pristine', 'Excellent', 'Good'] as const) {
      const unit = gradeOffer(variants, active, grade)!;
      expect(gradeRow(grade).textContent).toContain(`£${unit.price}`);
    }

    await userEvent.click(gradeRow('Good'));
    expect(onSelect.mock.lastCall![0]).toBe(gradeOffer(variants, active, 'Good'));
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

