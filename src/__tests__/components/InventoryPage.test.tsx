import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import InventoryPage from '../../components/admin/InventoryPage';
import type { Product } from '../../types';
import type { StaffRole, Capability } from '../../lib/adminRoles';

// The page is exercised against a mocked data layer: these tests are about the
// console's behaviour (rendering, inline stock edits, archiving and restoring),
// not about Firestore itself.
const listInventory = vi.fn();
const listBrands = vi.fn();
const setStock = vi.fn();
const archiveProduct = vi.fn();
const restoreProduct = vi.fn();
// Not used by the page, and that is the point: they are mocked so a call to
// either one would be visible rather than merely absent from the source.
const purgeProduct = vi.fn();

vi.mock('../../lib/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/adminApi')>();
  return {
    ...actual,
    listInventory: (...a: unknown[]) => listInventory(...a),
    listBrands: (...a: unknown[]) => listBrands(...a),
    setStock: (...a: unknown[]) => setStock(...a),
    archiveProduct: (...a: unknown[]) => archiveProduct(...a),
    restoreProduct: (...a: unknown[]) => restoreProduct(...a),
    purgeProduct: (...a: unknown[]) => purgeProduct(...a),
  };
});

const toCsv = vi.fn(() => 'id,model\n');
const downloadCsv = vi.fn();

vi.mock('../../lib/adminExport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/adminExport')>();
  return {
    ...actual,
    toCsv: (...a: unknown[]) => toCsv(...(a as [])),
    downloadCsv: (...a: unknown[]) => downloadCsv(...a),
  };
});

// The signed-in role, switched per test. The capability lookup is the real
// one from adminRoles, so these tests fail if the policy table changes under
// them rather than agreeing with a copy of it kept here.
const signedIn = { role: 'admin' as StaffRole };

vi.mock('../../hooks/useAdmin', async () => {
  const roles = await vi.importActual<typeof import('../../lib/adminRoles')>('../../lib/adminRoles');
  return {
    useAdmin: () => ({
      isAdmin: signedIn.role === 'admin',
      role: signedIn.role,
      isStaff: signedIn.role !== 'none',
      can: (capability: Capability) => roles.can(signedIn.role, capability),
      isLoading: false,
    }),
  };
});

function product(over: Partial<Product> = {}): Product {
  return {
    id: 'apple-iphone-17',
    model: 'iPhone 17',
    brand: 'Apple',
    category: 'Phones',
    storage: '256GB',
    price: 759,
    originalPrice: 1099,
    grade: 'Good',
    batteryHealth: 90,
    warrantyMonths: 12,
    returnDays: 30,
    imageUrl: '/assets/x.jpg',
    isCertified: true,
    stock: 4,
    specs: {},
    ...over,
  } as Product;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/inventory']}>
      <InventoryPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  signedIn.role = 'admin';
  listBrands.mockResolvedValue(['Apple', 'Samsung']);
  listInventory.mockResolvedValue({ products: [product()], total: 1, truncated: false });
  setStock.mockResolvedValue(undefined);
  archiveProduct.mockResolvedValue(undefined);
  restoreProduct.mockResolvedValue(undefined);
});

describe('InventoryPage', () => {
  it('lists products with their stock level', async () => {
    renderPage();
    expect(await screen.findByText('Apple iPhone 17')).toBeInTheDocument();
    expect(screen.getByText('1 product')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit stock for Apple iPhone 17, currently 4/i })).toBeInTheDocument();
  });

  it('shows the empty state when nothing matches', async () => {
    listInventory.mockResolvedValue({ products: [], total: 0, truncated: false });
    renderPage();
    expect(await screen.findByText(/No products match those filters/i)).toBeInTheDocument();
  });

  it('surfaces a load failure instead of rendering an empty list silently', async () => {
    listInventory.mockRejectedValue({ code: 'permission-denied', message: 'Missing or insufficient permissions.' });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/not an admin/i);
  });

  it('saves an inline stock edit', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Edit stock for Apple iPhone 17/i }));
    const input = screen.getByRole('spinbutton', { name: /Stock for Apple iPhone 17/i });
    await user.clear(input);
    await user.type(input, '12');
    await user.click(screen.getByRole('button', { name: /Save stock/i }));

    await waitFor(() => expect(setStock).toHaveBeenCalledWith('apple-iphone-17', 12));
    expect(await screen.findByRole('status')).toHaveTextContent(/Stock updated/i);
  });

  it('reverts and reports when the stock edit is rejected', async () => {
    setStock.mockRejectedValue({ code: 'permission-denied', message: 'Missing or insufficient permissions.' });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Edit stock for Apple iPhone 17/i }));
    const input = screen.getByRole('spinbutton', { name: /Stock for Apple iPhone 17/i });
    await user.clear(input);
    await user.type(input, '9');
    await user.click(screen.getByRole('button', { name: /Save stock/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/not an admin/i);
    await waitFor(() => expect(input).toHaveValue(4));
  });

  it('rejects a negative stock value without calling the database', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Edit stock for Apple iPhone 17/i }));
    const input = screen.getByRole('spinbutton', { name: /Stock for Apple iPhone 17/i });
    await user.clear(input);
    await user.type(input, '-3');
    await user.click(screen.getByRole('button', { name: /Save stock/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/whole number of 0 or more/i);
    expect(setStock).not.toHaveBeenCalled();
  });

  /**
   * Withdrawing a product is one click away from the list, so it is confirmed
   * first, and cancelling has to leave the catalogue exactly as it was. The
   * dialog also has to describe what archiving does: the copy it replaced
   * warned that the action could not be undone, which is now the opposite of
   * the truth and would stop someone doing the safe thing.
   */
  it('requires confirmation before archiving, and does not archive on cancel', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Archive Apple iPhone 17/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/stock set to 0/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/reversible/i)).toBeInTheDocument();
    expect(within(dialog).queryByText(/cannot be undone/i)).toBeNull();

    await user.click(within(dialog).getByRole('button', { name: /Keep it on sale/i }));
    expect(archiveProduct).not.toHaveBeenCalled();
  });

  /**
   * The whole point of the change: a product is named by every order and
   * return that ever contained it, so the confirm has to archive the record
   * rather than remove it. firestore.rules refuses a product delete outright,
   * so a page that still tried would fail in front of whoever pressed it.
   */
  it('archives the product once confirmed, and deletes nothing', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Archive Apple iPhone 17/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^Archive$/i }));

    await waitFor(() => expect(archiveProduct).toHaveBeenCalledWith('apple-iphone-17'));
    expect(purgeProduct).not.toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent(/archived/i);
  });

  /**
   * A stronger statement than "the confirm archives": the page must not reach
   * a delete by any route at all — not a leftover handler, not a direct
   * Firestore call. Reading the source is the only way to pin the absence of
   * a call that no test happens to trigger.
   */
  it('has no delete path anywhere in the page', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/admin/InventoryPage.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/deleteProduct|purgeProduct|deleteDoc/);
  });

  /**
   * Archiving is manager-only. Staff run the shop floor all day, and a button
   * that exists only to refuse them teaches people to click through refusals
   * until they stop reading them — so it is not rendered at all. Everything
   * else on the page stays theirs.
   */
  it('offers archiving to a manager and not to staff', async () => {
    signedIn.role = 'staff';
    const { unmount } = renderPage();
    await screen.findByText('Apple iPhone 17');
    expect(screen.queryByRole('button', { name: /Archive Apple iPhone 17/i })).toBeNull();
    // The rest of the console is still theirs.
    expect(screen.getByRole('button', { name: /Edit stock for Apple iPhone 17/i })).toBeInTheDocument();
    unmount();

    signedIn.role = 'admin';
    renderPage();
    expect(await screen.findByRole('button', { name: /Archive Apple iPhone 17/i })).toBeInTheDocument();
  });

  /**
   * The archived set is a different and usually much shorter list. Switching
   * to it while the pager sat on page 2 would ask for a page that does not
   * exist, and an empty table reads as a broken query rather than as the end
   * of a short list.
   */
  it('queries the archived set and returns to page 1 when the view changes', async () => {
    listInventory.mockResolvedValue({ products: [product()], total: 120, truncated: false });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Apple iPhone 17');

    await user.click(screen.getByRole('button', { name: /Next/i }));
    await waitFor(() => expect(listInventory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));

    await user.click(screen.getByRole('tab', { name: /Archived/i }));

    await waitFor(() => expect(listInventory).toHaveBeenLastCalledWith(
      expect.objectContaining({ archived: 'archived', page: 1 }),
    ));
  });

  /**
   * Restoring is how a product archived by mistake comes back, so the row
   * action on the Archived tab has to reach restoreProduct. The copy has to
   * say the stock stays at zero as well: archiving zeroed it, and putting the
   * old figure back would be inventing stock nobody has counted.
   */
  it('restores an archived product once confirmed', async () => {
    listInventory.mockResolvedValue({
      products: [product({ archivedAt: '2026-09-01T10:00:00.000Z', archivedBy: 'sam@lehart.co.uk', stock: 0 })],
      total: 1,
      truncated: false,
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('tab', { name: /Archived/i }));
    await user.click(await screen.findByRole('button', { name: /Restore Apple iPhone 17/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/stays at 0/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /^Restore$/i }));

    await waitFor(() => expect(restoreProduct).toHaveBeenCalledWith('apple-iphone-17'));
  });

  /**
   * An export of the 25 rows on screen looks like the catalogue and is not,
   * and a file that drops everything archived cannot be reconciled against an
   * order from last year — which is most of what anyone exports this for. So
   * the export re-runs the query for the whole record, archived included.
   */
  it('exports the whole matching set rather than the page on screen', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Apple iPhone 17');

    await user.click(screen.getByRole('button', { name: /Export CSV/i }));

    await waitFor(() => expect(downloadCsv).toHaveBeenCalled());
    const query = listInventory.mock.calls.at(-1)?.[0] as { archived: string; page: number; pageSize: number };
    expect(query.archived).toBe('all');
    expect(query.page).toBe(1);
    expect(query.pageSize).toBeGreaterThan(25);
  });

  /**
   * The console only started stamping who touched what recently, so most rows
   * have no stamp. "Updated by unknown" and a 1970 date both look like
   * answers, and someone chasing a bad price change would waste the afternoon
   * on one. Nothing is the honest rendering of nothing.
   */
  it('prints provenance where it exists and nothing where it does not', async () => {
    listInventory.mockResolvedValue({
      products: [product({ updatedAt: '2026-09-11T08:12:44.000Z', updatedBy: 'sam@lehart.co.uk' })],
      total: 1,
      truncated: false,
    });
    const { unmount } = renderPage();
    // Sep or Sept, depending on the ICU data the runner was built with.
    expect(await screen.findByText(/Updated 11 Sept? 2026 by sam@lehart\.co\.uk/i)).toBeInTheDocument();
    unmount();

    listInventory.mockResolvedValue({ products: [product()], total: 1, truncated: false });
    renderPage();
    await screen.findByText('Apple iPhone 17');
    expect(screen.queryByText(/unknown/i)).toBeNull();
    expect(screen.queryByText(/1970/)).toBeNull();
    expect(screen.queryByText(/^Updated/i)).toBeNull();
  });

  /**
   * The catalogue can outgrow what one read carries, and when it does the
   * count, the filters and the pager all describe a slice while looking like
   * they describe the shop. Saying so is the difference between a figure
   * somebody can act on and one that quietly lies.
   */
  it('marks the count as partial when the read hit its ceiling', async () => {
    listInventory.mockResolvedValue({ products: [product()], total: 1000, truncated: true });
    renderPage();
    await screen.findByText('Apple iPhone 17');

    expect(screen.getByText('Partial count')).toBeInTheDocument();
    expect(screen.getByText(/describe that first slice/i)).toBeInTheDocument();
  });

  /**
   * A short export is the same lie in a file that leaves the building, and
   * nobody re-checks a spreadsheet against the console. The download still
   * happens — part of the record beats none — but it is announced.
   */
  it('says so when the export could not carry the whole catalogue', async () => {
    listInventory.mockResolvedValue({ products: [product()], total: 1000, truncated: true });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Apple iPhone 17');

    await user.click(screen.getByRole('button', { name: /Export CSV/i }));

    await waitFor(() => expect(downloadCsv).toHaveBeenCalled());
    expect(await screen.findByRole('alert')).toHaveTextContent(/not the whole of it/i);
  });

  it('passes the stock filter through to the query', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Apple iPhone 17');

    await user.selectOptions(screen.getByRole('combobox', { name: /Filter by stock/i }), 'out');

    await waitFor(() =>
      expect(listInventory).toHaveBeenLastCalledWith(expect.objectContaining({ stockFilter: 'out' })),
    );
  });
});
