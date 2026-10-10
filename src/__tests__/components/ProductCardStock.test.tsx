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

  it('at stock 0 asks for an email instead of offering to buy', () => {
    render(<MemoryRouter><ProductCard phone={{ ...base, stock: 0 }} /></MemoryRouter>);
    expect(screen.getByText(/Sold out/)).toBeTruthy();
    expect(screen.queryByText(/Buy Now/)).toBeNull();
    expect(screen.getByRole('button', { name: /notified when .* back in stock/i })).toBeTruthy();
  });

  it('shows a real colour for finishes a browser does not know by name', () => {
    const { container } = render(<MemoryRouter><ProductCard phone={{ ...base, stock: 1, colorOptions: ['Porcelain'], variants: [] }} /></MemoryRouter>);
    const dot = container.querySelector('[aria-label="Porcelain"]') as HTMLElement;
    expect(dot.style.background).toMatch(/rgb|#/);
  });

  it('tells Samsung finishes apart, even past a stored placeholder grey', () => {
    const finishes = ['Titanium Silver', 'Titanium Jet Black', 'Titanium Icy Blue'];
    const variants = finishes.map((color, i) => ({
      id: `v${i}`, color, colorHex: '#888888', price: 500, originalPrice: 500, stock: 1,
    }));
    const { container } = render(<MemoryRouter><ProductCard phone={{ ...base, brand: 'Samsung', stock: 1, colorOptions: finishes, variants }} /></MemoryRouter>);
    const backgrounds = finishes.map(c => (container.querySelector(`[aria-label="${c}"]`) as HTMLElement).style.background);
    expect(new Set(backgrounds).size).toBe(3);
    expect(backgrounds).not.toContain('rgb(136, 136, 136)');
  });
});
