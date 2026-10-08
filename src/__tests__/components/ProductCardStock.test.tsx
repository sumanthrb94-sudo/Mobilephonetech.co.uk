import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductCard from '../../components/ProductCard';
import { MOCK_PHONES } from '../../test/fixtures/mockPhones';

vi.mock('../../context/WishlistContext', () => ({
  useWishlist: () => ({ isInWishlist: () => false, addToWishlist: vi.fn(), removeFromWishlist: vi.fn() }),
}));
vi.mock('../../context/UIContext', () => ({ useUI: () => ({ showToast: vi.fn(), openCart: vi.fn() }) }));
vi.mock('../../components/QuickViewModal', () => ({ default: () => null }));

const base = { ...MOCK_PHONES[0], imageUrl: '' };

describe('product card stock', () => {
  it('offers to buy a product in stock', () => {
    render(<MemoryRouter><ProductCard phone={{ ...base, stock: 3 }} /></MemoryRouter>);
    expect(screen.getByText(/Buy Now/)).toBeTruthy();
    expect(screen.queryByText('Out of stock')).toBeNull();
  });

  it('says out of stock, and does not offer to buy, at stock 0', () => {
    render(<MemoryRouter><ProductCard phone={{ ...base, stock: 0 }} /></MemoryRouter>);
    expect(screen.getByText('Out of stock')).toBeTruthy();
    expect(screen.queryByText(/Buy Now/)).toBeNull();
    expect(screen.getByText(/View details/)).toBeTruthy();
  });
});
