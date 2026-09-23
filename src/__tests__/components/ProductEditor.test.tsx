import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductEditor from '../../components/admin/ProductEditor';
import type { CatalogueModel, ModelRequest } from '../../lib/catalogue';
import type { StaffRole } from '../../lib/adminRoles';
import type { Product } from '../../types';

/**
 * The owner's rule, pinned: staff choose a model from the catalogue and
 * cannot type one; a missing model becomes a request for a manager; only a
 * manager adds to the catalogue.
 *
 * What the editor writes matters as much as what it shows. firestore.rules
 * refuses a staff listing whose brand and model are not a live catalogue
 * entry spelt exactly as the entry spells it, so these tests check the
 * values handed to createProduct and updateProduct, not just the screen.
 *
 * The catalogue's pure helpers are the real ones, so a change to how brands
 * are listed or model names are checked shows up here as a failure rather
 * than passing against a stub that still behaves the old way. The role runs
 * through the real capability table for the same reason.
 */

const getProduct = vi.fn();
const createProduct = vi.fn();
const updateProduct = vi.fn();
const listCatalogueModels = vi.fn();
const listModelRequests = vi.fn();
const addCatalogueModel = vi.fn();
const requestModel = vi.fn();

const ME = 'sam@lehart.co.uk';

vi.mock('../../lib/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/adminApi')>();
  return {
    ...actual,
    getProduct: (...a: unknown[]) => getProduct(...a),
    createProduct: (...a: unknown[]) => createProduct(...a),
    updateProduct: (...a: unknown[]) => updateProduct(...a),
    currentActor: () => ME,
  };
});

vi.mock('../../lib/catalogue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/catalogue')>();
  return {
    ...actual,
    listCatalogueModels: () => listCatalogueModels(),
    listModelRequests: (...a: unknown[]) => listModelRequests(...a),
    addCatalogueModel: (...a: unknown[]) => addCatalogueModel(...a),
    requestModel: (...a: unknown[]) => requestModel(...a),
  };
});

// The role is the whole point of the rule, so every test sets it deliberately
// rather than inheriting it from a signed-in user.
let role: StaffRole = 'staff';
vi.mock('../../hooks/useAdmin', async () => {
  const { can } = await vi.importActual<typeof import('../../lib/adminRoles')>('../../lib/adminRoles');
  return {
    useAdmin: () => ({
      isAdmin: role === 'admin',
      role,
      isStaff: role !== 'none',
      can: (capability: Parameters<typeof can>[1]) => can(role, capability),
      isLoading: false,
    }),
  };
});

const CATALOGUE: CatalogueModel[] = [
  { id: 'apple__iphone-8', brand: 'Apple', model: 'iPhone 8' },
  { id: 'apple__iphone-16', brand: 'Apple', model: 'iPhone 16' },
  { id: 'apple__iphone-x', brand: 'Apple', model: 'iPhone X', retiredAt: '2026-01-01T00:00:00.000Z' },
  { id: 'samsung__galaxy-s23', brand: 'Samsung', model: 'Galaxy S23' },
];

const product = (over: Partial<Product> = {}): Product => ({
  id: 'apple-iphone-8',
  brand: 'Apple',
  model: 'iPhone 8',
  catalogueModelId: 'apple__iphone-8',
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

const brandSelect = () => screen.getByRole('combobox', { name: /^Brand/ });
const modelSelect = () => screen.getByRole('combobox', { name: /^Model/ });

/** The catalogue arrives a tick after mount; until then the selects say Loading. */
async function catalogueLoaded() {
  await waitFor(() =>
    expect(within(brandSelect()).queryByRole('option', { name: 'Apple' })).toBeInTheDocument());
}

/** The rest of a valid draft, so a save is only ever stopped by brand and model. */
async function fillPricing(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Selling price/), '149');
  await user.type(screen.getByLabelText(/Was price/), '299');
}

beforeEach(() => {
  vi.clearAllMocks();
  role = 'staff';
  listCatalogueModels.mockResolvedValue(CATALOGUE);
  listModelRequests.mockResolvedValue([]);
  getProduct.mockResolvedValue(product());
  createProduct.mockResolvedValue(undefined);
  updateProduct.mockResolvedValue(undefined);
});

describe('ProductEditor brand and model, for staff', () => {
  /**
   * The owner's instruction in one assertion. A text box for model, however
   * well it suggests or snaps, is a place to type "iPhone 8 128GB" — a phone
   * the product page groups with no other size of itself. Staff get lists.
   */
  it('gives staff no text box for brand or model at all', async () => {
    renderEditor();
    await catalogueLoaded();

    expect(screen.queryByRole('textbox', { name: /brand/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /model/i })).not.toBeInTheDocument();
    expect(brandSelect()).toBeInTheDocument();
    expect(modelSelect()).toBeDisabled();
    expect(within(brandSelect()).queryByRole('option', { name: /New brand/ })).not.toBeInTheDocument();
  });

  /**
   * The database compares the listing's brand and model with the entry its
   * catalogueModelId names, character for character. The editor has to write
   * all three from the entry, or a correct choice is refused at Save.
   */
  it('writes the chosen entry’s exact brand, model and id to the new listing', async () => {
    const user = userEvent.setup();
    renderEditor();
    await catalogueLoaded();

    await user.selectOptions(brandSelect(), 'Apple');
    await user.selectOptions(modelSelect(), 'iPhone 16');
    await fillPricing(user);
    await user.click(screen.getByRole('button', { name: /Create product/i }));

    await waitFor(() => expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({
      brand: 'Apple',
      model: 'iPhone 16',
      catalogueModelId: 'apple__iphone-16',
      id: 'apple-iphone-16',
    })));
  });

  /**
   * Offering every model in the shop under every brand is how a Samsung ends
   * up filed under Apple. A retired model is not offered to a new listing at
   * all: it is in the catalogue only so old listings keep pointing at it.
   */
  it('offers only the live models of the chosen brand', async () => {
    const user = userEvent.setup();
    renderEditor();
    await catalogueLoaded();

    await user.selectOptions(brandSelect(), 'Samsung');
    expect(pickable(modelSelect())).toEqual(['Galaxy S23']);

    await user.selectOptions(brandSelect(), 'Apple');
    expect(pickable(modelSelect())).toEqual(['iPhone 8', 'iPhone 16']);
  });

  /**
   * Without a model there is nothing for the database to check the listing
   * against, and it would refuse it. Saying so under the field, in words
   * that say what to do, beats a permission error from the server.
   */
  it('will not create a listing without a catalogue model, and says what to do', async () => {
    const user = userEvent.setup();
    renderEditor();
    await catalogueLoaded();

    await user.selectOptions(brandSelect(), 'Apple');
    await fillPricing(user);
    await user.click(screen.getByRole('button', { name: /Create product/i }));

    expect(await screen.findByText('Choose a model from the catalogue.')).toBeInTheDocument();
    expect(createProduct).not.toHaveBeenCalled();
  });

  /**
   * The only way forward for a model the catalogue lacks. The request is
   * refused while the name carries a storage size, because a manager
   * approving "iPhone 17 128GB" would put exactly the orphan the catalogue
   * exists to prevent into it. And once sent, the person is told what happens
   * next rather than left wondering whether anything did.
   */
  it('lets staff ask a manager for a missing model, and says what happens next', async () => {
    const user = userEvent.setup();
    requestModel.mockImplementation(async (input: { brand: string; model: string; note?: string }) => ({
      id: 'r1', ...input, status: 'open', requestedBy: ME,
    }));
    renderEditor();
    await catalogueLoaded();

    await user.click(screen.getByRole('button', { name: /Model not listed\? Ask a manager to add it/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: /Brand you need/ }), 'Apple');
    const model = screen.getByRole('textbox', { name: /Model you need/ });
    const send = screen.getByRole('button', { name: /Send to a manager/ });

    await user.type(model, 'iPhone 17 128GB');
    expect(send).toBeDisabled();
    expect(screen.getByText(/Storage belongs in the Storage field/)).toBeInTheDocument();

    await user.clear(model);
    await user.type(model, 'iPhone 17');
    await user.type(screen.getByRole('textbox', { name: /What are you trying to list/ }), 'Trade-in, grade A');
    expect(send).toBeEnabled();
    await user.click(send);

    await waitFor(() => expect(requestModel).toHaveBeenCalledWith(
      { brand: 'Apple', model: 'iPhone 17', note: 'Trade-in, grade A' },
      { catalogue: CATALOGUE, open: [] },
    ));
    const confirmation = await screen.findByRole('status');
    expect(confirmation).toHaveTextContent(/is with a manager/);
    expect(confirmation).toHaveTextContent(/will appear in the Model list above/);
  });

  /**
   * "What happened to my request?" is answered where the model was needed.
   * A decline without its reason sends the person off to ask a colleague;
   * someone else's requests are theirs to follow, not this person's.
   */
  it('shows the person their own declined request with its reason', async () => {
    const mine: ModelRequest = {
      id: 'r1', brand: 'Apple', model: 'iPhone 5c', status: 'declined',
      requestedBy: ME, decidedBy: 'owner@lehart.co.uk', reason: 'We no longer buy in phones that old.',
    };
    const theirs: ModelRequest = {
      id: 'r2', brand: 'Nokia', model: '3310', status: 'declined',
      requestedBy: 'alex@lehart.co.uk', reason: 'Not a smartphone.',
    };
    listModelRequests.mockResolvedValue([mine, theirs]);
    renderEditor();
    await catalogueLoaded();

    expect(await screen.findByText(/We no longer buy in phones that old\./)).toBeInTheDocument();
    expect(screen.getByText('Apple iPhone 5c')).toBeInTheDocument();
    expect(screen.queryByText(/Not a smartphone/)).not.toBeInTheDocument();
  });
});

describe('ProductEditor brand and model, for a manager', () => {
  /**
   * A manager adds a model on the spot instead of queueing a request for
   * themselves. The entry has to exist before the listing that names it, and
   * the listing must carry the id and spelling the catalogue returned, not
   * what was typed.
   */
  it('adds a new model to the catalogue before saving the listing against it', async () => {
    role = 'admin';
    addCatalogueModel.mockResolvedValue({ id: 'apple__iphone-17', brand: 'Apple', model: 'iPhone 17' });
    const user = userEvent.setup();
    renderEditor();
    await catalogueLoaded();

    await user.selectOptions(brandSelect(), 'Apple');
    await user.selectOptions(modelSelect(), '+ Add a model…');
    await user.type(screen.getByRole('textbox', { name: /New model name/ }), 'iphone 17');
    expect(screen.getByText(/Adds this model to the catalogue for everyone/)).toBeInTheDocument();
    await fillPricing(user);
    await user.click(screen.getByRole('button', { name: /Create product/i }));

    await waitFor(() => expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({
      brand: 'Apple', model: 'iPhone 17', catalogueModelId: 'apple__iphone-17',
    })));
    expect(addCatalogueModel).toHaveBeenCalledWith('Apple', 'iphone 17', CATALOGUE);
    expect(addCatalogueModel.mock.invocationCallOrder[0]).toBeLessThan(createProduct.mock.invocationCallOrder[0]);
    expect(requestModel).not.toHaveBeenCalled();
  });
});

describe('ProductEditor on listings older than the catalogue', () => {
  /**
   * A listing saved before the catalogue existed, spelt its own way. Its
   * model is in the catalogue, so the next save links it and corrects the
   * spelling — which is what puts it back beside its other sizes on the
   * product page.
   */
  it('links a listing whose model the catalogue carries, in the catalogue’s spelling', async () => {
    getProduct.mockResolvedValue(product({ model: 'iphone  8', catalogueModelId: undefined }));
    const user = userEvent.setup();
    renderEditor('/admin/inventory/apple-iphone-8');

    expect(await screen.findByText(/will be linked to the catalogue entry/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Save changes/i }));

    await waitFor(() => expect(updateProduct).toHaveBeenCalledWith(expect.objectContaining({
      brand: 'Apple', model: 'iPhone 8', catalogueModelId: 'apple__iphone-8',
    })));
  });

  /**
   * The regression that would make this unshippable. A listing whose model
   * the catalogue does not carry must still take a price change from staff.
   * The database only checks the catalogue when brand, model or the link
   * change, so the editor must send them exactly as they were and send no
   * link at all — even an empty one counts as a change.
   */
  it('lets staff change the price of a listing whose model is not in the catalogue', async () => {
    getProduct.mockResolvedValue(product({ model: 'iPhone 8 128GB', catalogueModelId: undefined }));
    const user = userEvent.setup();
    renderEditor('/admin/inventory/apple-iphone-8');

    expect(await screen.findByText(/is not in the catalogue yet/)).toBeInTheDocument();
    expect(screen.getByText(/A manager needs to add or import this model/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /^Model/ })).not.toBeInTheDocument();

    const price = screen.getByLabelText(/Selling price/);
    await user.clear(price);
    await user.type(price, '139');
    await user.click(screen.getByRole('button', { name: /Save changes/i }));

    await waitFor(() => expect(updateProduct).toHaveBeenCalledTimes(1));
    const saved = updateProduct.mock.calls[0][0];
    expect(saved).toMatchObject({ brand: 'Apple', model: 'iPhone 8 128GB', price: 139 });
    expect(saved.catalogueModelId).toBeUndefined();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /**
   * A retired entry is withdrawn from new listings, not from the ones that
   * already use it. Opening such a listing must show what it is, say why it
   * is not in the list, and save it as it was.
   */
  it('shows a retired model as retired and saves it unchanged', async () => {
    getProduct.mockResolvedValue(product({ model: 'iPhone X', catalogueModelId: 'apple__iphone-x' }));
    const user = userEvent.setup();
    renderEditor('/admin/inventory/apple-iphone-8');
    await catalogueLoaded();

    expect(modelSelect()).toHaveDisplayValue('iPhone X (retired)');
    expect(screen.getByText(/Retired from the catalogue/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Save changes/i }));

    await waitFor(() => expect(updateProduct).toHaveBeenCalledWith(expect.objectContaining({
      brand: 'Apple', model: 'iPhone X', catalogueModelId: 'apple__iphone-x',
    })));
  });
});

describe('ProductEditor when the catalogue will not load', () => {
  /**
   * A read that failed is not an empty catalogue. Telling staff "no models
   * yet, ask a manager to set it up" during an outage sends them after the
   * wrong person; saying it failed, and offering to try again, does not.
   */
  it('says the catalogue could not be loaded, and offers to try again', async () => {
    listCatalogueModels.mockRejectedValueOnce({ code: 'unavailable', message: 'offline' });
    const user = userEvent.setup();
    renderEditor();

    expect(await screen.findByText(/Could not load the catalogue/)).toBeInTheDocument();
    expect(screen.queryByText(/no models yet/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await catalogueLoaded();
    expect(listCatalogueModels).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/Could not load the catalogue/)).not.toBeInTheDocument();
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
    await screen.findByRole('heading', { name: 'Edit Apple iPhone 8' });

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
    await screen.findByRole('heading', { name: 'Edit Apple iPhone 8' });

    expect(await screen.findByText(/Last saved by admin@lehart\.co\.uk · 22 Sept? 2026/)).toBeInTheDocument();
  });
});

/** The models a select offers, without its placeholder or its instructions. */
function pickable(select: HTMLElement): string[] {
  return within(select).getAllByRole('option')
    .filter(o => !(o as HTMLOptionElement).disabled && !(o as HTMLOptionElement).value.startsWith('__'))
    .map(o => o.textContent ?? '');
}
