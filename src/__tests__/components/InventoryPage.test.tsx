import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import InventoryPage from '../../components/admin/InventoryPage';
import type { Product } from '../../types';

// The page is exercised against a mocked data layer: these tests are about the
// console's behaviour (rendering, inline stock edits, delete confirmation),
// not about Firestore itself.
const listInventory = vi.fn();
const listBrands = vi.fn();
const setStock = vi.fn();
const deleteProduct = vi.fn();

vi.mock('../../lib/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/adminApi')>();
  return {
    ...actual,
    listInventory: (...a: unknown[]) => listInventory(...a),
    listBrands: (...a: unknown[]) => listBrands(...a),
    setStock: (...a: unknown[]) => setStock(...a),
    deleteProduct: (...a: unknown[]) => deleteProduct(...a),
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
  listBrands.mockResolvedValue(['Apple', 'Samsung']);
  listInventory.mockResolvedValue({ products: [product()], total: 1 });
  setStock.mockResolvedValue(undefined);
  deleteProduct.mockResolvedValue(undefined);
});

describe('InventoryPage', () => {
  it('lists products with their stock level', async () => {
    renderPage();
    expect(await screen.findByText('Apple iPhone 17')).toBeInTheDocument();
    expect(screen.getByText('1 product')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit stock for Apple iPhone 17, currently 4/i })).toBeInTheDocument();
  });

  it('shows the empty state when nothing matches', async () => {
    listInventory.mockResolvedValue({ products: [], total: 0 });
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

  it('requires confirmation before deleting, and does not delete on cancel', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Delete Apple iPhone 17/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/cannot be undone/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /Keep it/i }));
    expect(deleteProduct).not.toHaveBeenCalled();
  });

  it('deletes once confirmed', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Delete Apple iPhone 17/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /Delete permanently/i }));

    await waitFor(() => expect(deleteProduct).toHaveBeenCalledWith('apple-iphone-17'));
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
