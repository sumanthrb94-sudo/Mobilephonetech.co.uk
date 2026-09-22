import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { CartProvider } from '../../context/CartContext';
import { WishlistProvider } from '../../context/WishlistContext';
import { UIProvider } from '../../context/UIContext';
import SeriesPage from '../../components/admin/SeriesPage';
import { BUILT_IN_PANELS, type SeriesPanel } from '../../lib/seriesPanels';
import type { Product } from '../../types';

/**
 * The series editor.
 *
 * The property worth pinning hardest is that the rule staff type is the rule
 * visitors get: the match count beside it and the preview below it both come
 * from the same function the home page uses, so neither can flatter a rule
 * that would show nothing.
 */

const product = (brand: string, model: string): Product => ({
  id: `${brand}-${model}`.toLowerCase().replace(/\s+/g, '-'),
  brand, model, price: 499, originalPrice: 699, stock: 3,
  grade: 'Excellent', category: 'Phones', images: [],
  description: '', conditionDescription: '', batteryHealth: 90,
  warrantyMonths: 12, returnDays: 30, colorOptions: [], storageOptions: [],
  imageUrl: '', isCertified: true, specs: {} as Product['specs'],
} as Product);

const CATALOGUE = [
  product('Samsung', 'Galaxy A54'),
  product('Samsung', 'Galaxy A34'),
  product('Samsung', 'Galaxy S23 Ultra'),
  product('Samsung', 'Galaxy Tab S9'),
  product('Google', 'Pixel Watch 2'),
];

const listPanels = vi.fn(async (): Promise<SeriesPanel[]> => []);
const savePanel = vi.fn(async (panel: SeriesPanel) => { void panel; });
const deletePanel = vi.fn(async (id: string) => { void id; });

vi.mock('../../lib/seriesPanels', async (orig) => {
  const actual = await orig<typeof import('../../lib/seriesPanels')>();
  return {
    ...actual,
    listPanels: () => listPanels(),
    savePanel: (p: SeriesPanel) => savePanel(p),
    deletePanel: (id: string) => deletePanel(id),
  };
});

vi.mock('../../lib/adminApi', async (orig) => {
  const actual = await orig<typeof import('../../lib/adminApi')>();
  return { ...actual, uploadImage: vi.fn(async () => 'https://example.test/hero.jpg') };
});

vi.mock('../../context/CatalogueContext', () => ({
  useCatalogue: () => ({ products: CATALOGUE, fromSupabase: false, isLoading: false }),
}));

/**
 * The preview renders the real panel, which renders real ProductCards — so
 * the test tree needs the providers those depend on, exactly as the admin
 * route does in the app. A preview cheap enough to mount without them would
 * be a preview that is not the real component.
 */
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/series']}>
      <UIProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <SeriesPage />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </UIProvider>
    </MemoryRouter>,
  );
}

/**
 * The preview renders real ProductCards, whose wishlist button is also
 * labelled "Save" and whose text also contains product counts — so the
 * queries below are scoped to the editor's own regions rather than the
 * whole tree.
 */
const el = (selector: string): HTMLElement => {
  const found = document.querySelector(selector);
  if (!found) throw new Error(`no ${selector} in the document`);
  return found as HTMLElement;
};
const matchLine = () => el('.sp-match');
const footButton = (name: RegExp) => within(el('.sp-foot')).getByRole('button', { name });

const lastSaved = (): SeriesPanel => {
  const call = savePanel.mock.calls.at(-1);
  if (!call) throw new Error('savePanel was never called');
  return call[0];
};

const aSeries: SeriesPanel = {
  ...BUILT_IN_PANELS[1],
  id: 'galaxy-a-1', eyebrow: 'Galaxy A · Everyday',
  headline: 'Flagship feel.', include: ['Galaxy A'], exclude: [],
  active: true, order: 0, updatedAt: '2026-09-22T10:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  listPanels.mockResolvedValue([aSeries]);
});

describe('SeriesPage', () => {
  it('lists a saved series and says whether it is live', async () => {
    renderPage();
    expect(await screen.findByDisplayValue('Galaxy A · Everyday')).toBeTruthy();
    expect(screen.getByText('Live')).toBeTruthy();
  });

  /**
   * The whole point of the feature: a series the site never shipped with.
   */
  it('creates a series that did not exist before, and saves its rule', async () => {
    listPanels.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('button', { name: /New series/i });

    await userEvent.click(screen.getByRole('button', { name: /New series/i }));

    await userEvent.type(screen.getByLabelText(/Series name/i), 'Galaxy A · Everyday');
    await userEvent.type(screen.getByLabelText(/^Headline/i), 'Flagship feel.');
    await userEvent.type(screen.getByLabelText(/^Brand/i), 'Samsung');
    await userEvent.type(screen.getByLabelText(/Model contains/i), 'Galaxy A');
    await userEvent.click(footButton(/^Save$/i));

    await waitFor(() => expect(savePanel).toHaveBeenCalled());
    const saved = lastSaved();
    expect(saved.brand).toBe('Samsung');
    expect(saved.include).toEqual(['Galaxy A']);
    // New panels are saved switched off, so nothing reaches the home page
    // by accident before someone has looked at the preview.
    expect(saved.active).toBe(false);
  });

  it('counts the products a rule selects, as it is typed', async () => {
    renderPage();
    await screen.findByDisplayValue('Galaxy A · Everyday');

    // "Galaxy A" matches the A54 and A34, and nothing else in the catalogue.
    await waitFor(() => expect(matchLine().textContent).toMatch(/2 products: Galaxy A54, Galaxy A34/));

    const include = screen.getByLabelText(/Model contains/i);
    await userEvent.clear(include);
    await userEvent.type(include, 'Galaxy');

    // Now the S23 and the Tab match too.
    await waitFor(() => expect(matchLine().textContent).toMatch(/4 products/));
  });

  it('warns when a rule matches nothing, rather than saving it silently', async () => {
    renderPage();
    await screen.findByDisplayValue('Galaxy A · Everyday');

    const include = screen.getByLabelText(/Model contains/i);
    await userEvent.clear(include);
    await userEvent.type(include, 'Nokia 3310');

    await waitFor(() => expect(matchLine().textContent).toMatch(/Nothing in the catalogue matches/i));
    expect(screen.getByText(/Nothing to preview/i)).toBeTruthy();
  });

  it('applies an exclusion so a tablet stays out of a phone series', async () => {
    renderPage();
    await screen.findByDisplayValue('Galaxy A · Everyday');

    // Widen the rule to every Samsung Galaxy: four products, tablet included.
    const include = screen.getByLabelText(/Model contains/i);
    await userEvent.clear(include);
    await userEvent.type(include, 'Galaxy');
    await waitFor(() => expect(matchLine().textContent).toMatch(/4 products/));
    expect(matchLine().textContent).toMatch(/Galaxy Tab S9/);

    await userEvent.type(screen.getByLabelText(/But not/i), 'Tab');
    await waitFor(() => expect(matchLine().textContent).toMatch(/3 products/));
    expect(matchLine().textContent).not.toMatch(/Galaxy Tab S9/);
  });

  it('will not save a series with no name or headline', async () => {
    listPanels.mockResolvedValue([{ ...aSeries, eyebrow: '', headline: '' }]);
    renderPage();
    await screen.findByText('Live');

    expect(footButton(/Save & put live/i).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/A series name is required/i)).toBeTruthy();
  });

  it('never deletes on a single click', async () => {
    renderPage();
    await screen.findByDisplayValue('Galaxy A · Everyday');

    await userEvent.click(footButton(/^Delete$/i));
    expect(deletePanel).not.toHaveBeenCalled();

    await userEvent.click(footButton(/Delete for good/i));
    await waitFor(() => expect(deletePanel).toHaveBeenCalledWith('galaxy-a-1'));
  });

  it('reorders with the arrow buttons and persists the move', async () => {
    const second = { ...aSeries, id: 'pixel-2', eyebrow: 'Pixel · Pure Android', order: 1 };
    listPanels.mockResolvedValue([aSeries, second]);
    renderPage();
    await screen.findByDisplayValue('Galaxy A · Everyday');

    await userEvent.click(screen.getByRole('button', { name: /Move Pixel · Pure Android up/i }));

    await waitFor(() => expect(savePanel).toHaveBeenCalled());
    // Both rows changed position, so both are written back with new orders.
    const orders = savePanel.mock.calls.map(c => [c[0].id, c[0].order]);
    expect(orders).toContainEqual(['pixel-2', 0]);
    expect(orders).toContainEqual(['galaxy-a-1', 1]);
  });

  it('shows the real panel component in the preview, not a mockup', async () => {
    renderPage();
    await screen.findByDisplayValue('Galaxy A · Everyday');

    // SeriesPanelView labels its section with the series name — the same
    // markup a visitor gets, which is the point of reusing the component.
    const preview = await screen.findByLabelText(/Galaxy A · Everyday — shop the series/i);
    expect(within(preview).getByText(/Flagship feel/)).toBeTruthy();
  });

  it('surfaces a failed save rather than claiming success', async () => {
    savePanel.mockRejectedValueOnce(new Error('Permission denied.'));
    renderPage();
    await screen.findByDisplayValue('Galaxy A · Everyday');

    await userEvent.click(footButton(/Save & put live/i));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Permission denied/i);
  });
});
