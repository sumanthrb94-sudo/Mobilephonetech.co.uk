import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductEditor from '../../components/admin/ProductEditor';
import type { CatalogueVocabulary } from '../../lib/adminApi';
import type { Product } from '../../types';

/**
 * The editor had no test before this, which is part of why two free-text
 * boxes were allowed to put "iPhone 8" and "iphone  8" in the catalogue as
 * separate phones — a divergence src/lib/productSiblings.ts still has to
 * normalise around at read time.
 *
 * What is pinned here is the intake rule itself: what is typed ends up
 * spelled the catalogue's way, only a manager may add an entry the catalogue
 * has never carried, and the gate keeps quiet in every case where it does
 * not actually know anything — an unread catalogue, an empty one, or a
 * product that was already saved with those values.
 */

const listCatalogueVocabulary = vi.fn();
const getProduct = vi.fn();
const createProduct = vi.fn();
const updateProduct = vi.fn();

vi.mock('../../lib/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/adminApi')>();
  return {
    ...actual,
    listCatalogueVocabulary: () => listCatalogueVocabulary(),
    getProduct: (...a: unknown[]) => getProduct(...a),
    createProduct: (...a: unknown[]) => createProduct(...a),
    updateProduct: (...a: unknown[]) => updateProduct(...a),
  };
});

// The role is the whole point of the gate, so it is the one thing every test
// sets deliberately rather than inheriting from a signed-in user.
let capabilities: string[] = [];
vi.mock('../../hooks/useAdmin', () => ({
  useAdmin: () => ({
    isAdmin: capabilities.includes('catalogue:extend'),
    role: capabilities.includes('catalogue:extend') ? 'admin' : 'staff',
    isStaff: true,
    can: (capability: string) => capabilities.includes(capability),
    isLoading: false,
  }),
}));

const STAFF = ['console', 'products:write'];
const MANAGER = [...STAFF, 'catalogue:extend'];

const VOCABULARY: CatalogueVocabulary = {
  brands: ['Apple', 'Samsung'],
  modelsByBrand: { apple: ['iPhone 8', 'iPhone 16'], samsung: ['Galaxy S23'] },
};

const product = (over: Partial<Product> = {}): Product => ({
  id: 'apple-iphone-8',
  brand: 'Apple',
  model: 'iPhone 8',
  category: 'Phones',
  storage: '64GB',
  price: 149,
  originalPrice: 299,
  grade: 'Good',
  batteryHealth: 88,
  warrantyMonths: 12,
  returnDays: 30,
  imageUrl: '/assets/x.jpg',
  galleryImages: [],
  isCertified: true,
  stock: 3,
  specs: {} as Product['specs'],
  ...over,
} as Product);

function renderEditor(path = '/admin/inventory/new') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/inventory" element={<p>Inventory list</p>} />
        <Route path="/admin/inventory/new" element={<ProductEditor />} />
        <Route path="/admin/inventory/:id" element={<ProductEditor />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The suggestions arrive a tick after mount; nothing snaps or gates before. */
async function vocabularyLoaded() {
  await waitFor(() =>
    expect(document.querySelectorAll('#catalogue-brands option').length).toBeGreaterThan(0));
}

const brandBox = () => screen.getByLabelText(/^Brand/);
const modelBox = () => screen.getByLabelText(/^Model/);

/** The rest of a valid draft, so a save is only ever refused by the gate. */
async function fillPricing(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Selling price/), '149');
  await user.type(screen.getByLabelText(/Was price/), '299');
}

beforeEach(() => {
  vi.clearAllMocks();
  capabilities = MANAGER;
  listCatalogueVocabulary.mockResolvedValue(VOCABULARY);
  getProduct.mockResolvedValue(product());
  createProduct.mockResolvedValue(product());
  updateProduct.mockResolvedValue(product());
});

describe('ProductEditor catalogue intake', () => {
  /**
   * The bug this whole feature exists for. Spacing and case are exactly what
   * separated "iPhone 8" from "iphone  8" in the live catalogue, so whatever
   * a person types has to leave the field spelled the catalogue's way.
   */
  it('snaps a differently-spaced model to the catalogue spelling when the field is left', async () => {
    const user = userEvent.setup();
    renderEditor();
    await vocabularyLoaded();

    await user.type(brandBox(), 'apple');
    await user.tab();
    await user.type(modelBox(), 'iphone  8');
    await user.tab();

    expect(brandBox()).toHaveValue('Apple');
    expect(modelBox()).toHaveValue('iPhone 8');
  });

  /**
   * Offering every model in the shop under every brand is how a Samsung
   * ends up filed under Apple. The suggestion list has to narrow to the
   * brand that is actually selected.
   */
  it('suggests only the models listed under the selected brand', async () => {
    const user = userEvent.setup();
    renderEditor();
    await vocabularyLoaded();

    await user.type(brandBox(), 'Samsung');
    await user.tab();

    const suggestions = [...document.querySelectorAll('#catalogue-models option')]
      .map(o => (o as HTMLOptionElement).value);
    expect(suggestions).toEqual(['Galaxy S23']);
  });

  /**
   * A staff member inventing a brand is how the catalogue grows a second
   * spelling of something it already has. The refusal names what they typed
   * and both ways out of it, because "invalid brand" leaves somebody staring
   * at a word that looks perfectly correct to them.
   */
  it('refuses to save a brand the catalogue has never carried when staff typed it', async () => {
    capabilities = STAFF;
    const user = userEvent.setup();
    renderEditor();
    await vocabularyLoaded();

    await user.type(brandBox(), 'Nokia');
    await user.tab();
    await user.type(modelBox(), 'N95');
    await fillPricing(user);
    await user.click(screen.getByRole('button', { name: /Create product/i }));

    const refusal = await screen.findByRole('alert');
    expect(refusal).toHaveTextContent(/no brand/i);
    expect(refusal).toHaveTextContent(/Nokia/);
    expect(refusal).toHaveTextContent(/ask a manager to add it/i);
    expect(createProduct).not.toHaveBeenCalled();
  });

  /**
   * A manager is allowed to extend the catalogue — that is what
   * `catalogue:extend` is — but the addition is shown to them first, so it is
   * a deliberate act rather than a typo nobody notices until it is two
   * products.
   */
  it('lets a manager add a new brand, telling them that is what they are doing', async () => {
    const user = userEvent.setup();
    renderEditor();
    await vocabularyLoaded();

    await user.type(brandBox(), 'Nokia');
    await user.tab();
    await user.type(modelBox(), 'N95');
    await fillPricing(user);

    expect(screen.getByText(/New brand — will be added to the catalogue/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Create product/i }));
    await waitFor(() =>
      expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ brand: 'Nokia', model: 'N95' })));
  });

  /**
   * The regression that would make this feature unshippable: every existing
   * product's brand and model are in the catalogue by definition, so opening
   * one and pressing Save must go through untouched, staff or not.
   */
  it('never blocks a staff member saving a product that is already in the catalogue', async () => {
    capabilities = STAFF;
    const user = userEvent.setup();
    renderEditor('/admin/inventory/apple-iphone-8');
    await screen.findByDisplayValue('iPhone 8');
    await vocabularyLoaded();

    await user.click(screen.getByRole('button', { name: /Save changes/i }));

    await waitFor(() =>
      expect(updateProduct).toHaveBeenCalledWith(expect.objectContaining({ brand: 'Apple', model: 'iPhone 8' })));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /**
   * A shop whose catalogue is empty has no opinion about spelling yet, and
   * the first product ever added would otherwise be refused for not matching
   * the nothing that is there.
   */
  it('blocks nothing when the catalogue is empty', async () => {
    capabilities = STAFF;
    listCatalogueVocabulary.mockResolvedValue({ brands: [], modelsByBrand: {} });
    const user = userEvent.setup();
    renderEditor();
    await waitFor(() => expect(listCatalogueVocabulary).toHaveBeenCalled());

    await user.type(brandBox(), 'Nokia');
    await user.type(modelBox(), 'N95');
    await fillPricing(user);
    await user.click(screen.getByRole('button', { name: /Create product/i }));

    await waitFor(() => expect(createProduct).toHaveBeenCalled());
  });

  /**
   * Same rule for a read that failed. Refusing every save because Firestore
   * was unreachable would present an outage as though the admin's account
   * lacked permission, and that wrong diagnosis costs an afternoon.
   */
  it('blocks nothing when the catalogue could not be read', async () => {
    capabilities = STAFF;
    listCatalogueVocabulary.mockRejectedValue({ code: 'unavailable', message: 'offline' });
    const user = userEvent.setup();
    renderEditor();
    await waitFor(() => expect(listCatalogueVocabulary).toHaveBeenCalled());

    await user.type(brandBox(), 'Nokia');
    await user.type(modelBox(), 'N95');
    await fillPricing(user);
    await user.click(screen.getByRole('button', { name: /Create product/i }));

    await waitFor(() => expect(createProduct).toHaveBeenCalled());
  });
});

describe('ProductEditor audit footnote', () => {
  /**
   * Products created before the stamp existed carry neither field, and a
   * document echoed back from a write that has not landed carries a
   * serverTimestamp sentinel rather than a date. Printing "Last saved by
   * unknown · 1 Jan 1970" would state something about the record that is
   * simply untrue, so an unstamped record gets no line at all.
   */
  it('prints nothing when the record has no stamp', async () => {
    getProduct.mockResolvedValue(product({ updatedBy: undefined, updatedAt: undefined }));
    renderEditor('/admin/inventory/apple-iphone-8');
    await screen.findByDisplayValue('iPhone 8');

    expect(screen.queryByText(/Last saved by/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument();
  });

  /**
   * And the line it does print names the person and the day. The month is
   * matched loosely because the abbreviation is the platform's to choose —
   * recent ICU data writes September as "Sept" where older data wrote "Sep",
   * and pinning that would make this test fail on a Node upgrade rather than
   * on a real change.
   */
  it('names who last saved a stamped record, and when', async () => {
    getProduct.mockResolvedValue(product({
      updatedBy: 'admin@lehart.co.uk',
      updatedAt: '2026-09-22T09:30:00.000Z',
    }));
    renderEditor('/admin/inventory/apple-iphone-8');
    await screen.findByDisplayValue('iPhone 8');

    expect(await screen.findByText(/Last saved by admin@lehart\.co\.uk · 22 Sept? 2026/)).toBeInTheDocument();
  });
});
