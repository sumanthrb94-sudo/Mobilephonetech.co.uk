import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { CartProvider, useCart } from '../../context/CartContext';
import { AuthProvider } from '../../context/AuthContext';
import type { Product } from '../../types';

// CartProvider now depends on AuthProvider (uses useAuth() internally)
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <CartProvider>{children}</CartProvider>
  </AuthProvider>
);

const PRODUCT_A: Product = {
  id: 'iphone-15-pro',
  model: 'iPhone 15 Pro',
  brand: 'Apple',
  category: 'Phones',
  price: 649,
  originalPrice: 899,
  grade: 'Excellent',
  batteryHealth: 92,
  warrantyMonths: 12,
  returnDays: 30,
  imageUrl: '/img/iphone15pro.jpg',
  isCertified: true,
  stock: 5,
  specs: {},
};

const PRODUCT_B: Product = {
  id: 'samsung-s24',
  model: 'Galaxy S24',
  brand: 'Samsung',
  category: 'Phones',
  price: 399,
  originalPrice: 549,
  grade: 'Good',
  batteryHealth: 85,
  warrantyMonths: 12,
  returnDays: 30,
  imageUrl: '/img/s24.jpg',
  isCertified: false,
  stock: 3,
  specs: {},
};

const CART_KEY = 'mpm_cart'; // new key used in main-branch CartContext

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── Initial state ─────────────────────────────────────
  it('starts with an empty cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.cartCount).toBe(0);
    expect(result.current.cartTotal).toBe(0);
  });

  it('starts with cart closed', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.isCartOpen).toBe(false);
  });

  it('throws when used outside CartProvider', () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => renderHook(() => useCart())).toThrow('useCart must be used within CartProvider');
    console.error = consoleError;
  });

  // ── addToCart ─────────────────────────────────────────
  it('adds a product to the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 1));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe('iphone-15-pro');
    expect(result.current.items[0].quantity).toBe(1);
  });

  it('increases quantity when adding same product twice', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 1));
    act(() => result.current.addToCart(PRODUCT_A, 2));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
  });

  it('treats same product with different colors as separate line items', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 1, { color: 'Black' }));
    act(() => result.current.addToCart(PRODUCT_A, 1, { color: 'White' }));
    expect(result.current.items).toHaveLength(2);
  });

  it('adds multiple distinct products', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 1));
    act(() => result.current.addToCart(PRODUCT_B, 1));
    expect(result.current.items).toHaveLength(2);
  });

  it('sets lastAddedItem and lastAddedQuantity on add', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 2));
    expect(result.current.lastAddedItem).not.toBeNull();
    expect(result.current.lastAddedItem!.id).toBe('iphone-15-pro');
    expect(result.current.lastAddedQuantity).toBe(2);
  });

  // ── removeFromCart ────────────────────────────────────
  it('removes a product from the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 1));
    act(() => result.current.removeFromCart('iphone-15-pro'));
    expect(result.current.items).toHaveLength(0);
  });

  it('removes only the specified product', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 1));
    act(() => result.current.addToCart(PRODUCT_B, 1));
    act(() => result.current.removeFromCart('iphone-15-pro'));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe('samsung-s24');
  });

  it('does nothing when removing non-existent product', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 1));
    act(() => result.current.removeFromCart('does-not-exist'));
    expect(result.current.items).toHaveLength(1);
  });

  // ── updateQuantity ────────────────────────────────────
  it('updates quantity of an existing item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 1));
    act(() => result.current.updateQuantity('iphone-15-pro', 5));
    expect(result.current.items[0].quantity).toBe(5);
  });

  it('removes item when quantity updated to 0', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 1));
    act(() => result.current.updateQuantity('iphone-15-pro', 0));
    expect(result.current.items).toHaveLength(0);
  });

  it('removes item when quantity updated to negative', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 1));
    act(() => result.current.updateQuantity('iphone-15-pro', -1));
    expect(result.current.items).toHaveLength(0);
  });

  // ── clearCart ─────────────────────────────────────────
  it('clears all items from the cart', async () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 2));
    act(() => result.current.addToCart(PRODUCT_B, 1));
    await act(async () => { await result.current.clearCart(); });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.cartCount).toBe(0);
    expect(result.current.cartTotal).toBe(0);
  });

  // ── Computed values ───────────────────────────────────
  it('calculates cartTotal correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 2)); // 649 * 2 = 1298
    act(() => result.current.addToCart(PRODUCT_B, 1)); // 399 * 1 = 399
    expect(result.current.cartTotal).toBe(1697);
  });

  it('calculates cartCount correctly', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 3));
    act(() => result.current.addToCart(PRODUCT_B, 2));
    expect(result.current.cartCount).toBe(5);
  });

  it('reflects updated total after quantity change', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 1));
    act(() => result.current.updateQuantity('iphone-15-pro', 3));
    expect(result.current.cartTotal).toBe(649 * 3);
  });

  // ── localStorage persistence ──────────────────────────
  it('persists cart to localStorage when items change', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 1));
    const stored = JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('iphone-15-pro');
  });

  it('loads cart from localStorage on mount', () => {
    const savedCart = [{ ...PRODUCT_A, quantity: 2 }];
    localStorage.setItem(CART_KEY, JSON.stringify(savedCart));
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
  });

  // ── Cart drawer ───────────────────────────────────────
  it('setIsCartOpen toggles cart open state', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.setIsCartOpen(true));
    expect(result.current.isCartOpen).toBe(true);
    act(() => result.current.setIsCartOpen(false));
    expect(result.current.isCartOpen).toBe(false);
  });

  // ── clearLastAdded ────────────────────────────────────
  it('clearLastAdded resets lastAddedItem', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart(PRODUCT_A, 1));
    act(() => result.current.clearLastAdded());
    expect(result.current.lastAddedItem).toBeNull();
    expect(result.current.lastAddedQuantity).toBe(0);
  });
});
