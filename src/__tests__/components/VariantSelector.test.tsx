import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import VariantSelector from '../../components/VariantSelector';
import type { Product } from '../../types';

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
