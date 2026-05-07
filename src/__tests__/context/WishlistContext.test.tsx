import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { WishlistProvider, useWishlist } from '../../context/WishlistContext';
import { AuthProvider } from '../../context/AuthContext';
import type { Product } from '../../types';

// WishlistProvider depends on AuthProvider (calls useAuth() internally)
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <WishlistProvider>{children}</WishlistProvider>
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

// The key used by WishlistContext to persist to localStorage
const WISHLIST_KEY = 'mpm_wishlist';

describe('WishlistContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  it('starts with an empty wishlist', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.wishlistCount).toBe(0);
  });

  // ── addToWishlist ─────────────────────────────────────────────────────────

  it('addToWishlist adds a product', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    act(() => result.current.addToWishlist(PRODUCT_A));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe('iphone-15-pro');
    expect(result.current.wishlistCount).toBe(1);
  });

  it('addToWishlist ignores duplicates', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    act(() => result.current.addToWishlist(PRODUCT_A));
    act(() => result.current.addToWishlist(PRODUCT_A));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.wishlistCount).toBe(1);
  });

  it('addToWishlist can hold multiple distinct products', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    act(() => result.current.addToWishlist(PRODUCT_A));
    act(() => result.current.addToWishlist(PRODUCT_B));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.wishlistCount).toBe(2);
  });

  // ── removeFromWishlist ────────────────────────────────────────────────────

  it('removeFromWishlist removes the product', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    act(() => result.current.addToWishlist(PRODUCT_A));
    act(() => result.current.removeFromWishlist('iphone-15-pro'));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.wishlistCount).toBe(0);
  });

  it('removeFromWishlist removes only the specified product', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    act(() => result.current.addToWishlist(PRODUCT_A));
    act(() => result.current.addToWishlist(PRODUCT_B));
    act(() => result.current.removeFromWishlist('iphone-15-pro'));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe('samsung-s24');
  });

  it('removeFromWishlist does nothing for a non-existent id', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    act(() => result.current.addToWishlist(PRODUCT_A));
    act(() => result.current.removeFromWishlist('does-not-exist'));

    expect(result.current.items).toHaveLength(1);
  });

  // ── isInWishlist ──────────────────────────────────────────────────────────

  it('isInWishlist returns true for a product that was added', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    act(() => result.current.addToWishlist(PRODUCT_A));

    expect(result.current.isInWishlist('iphone-15-pro')).toBe(true);
  });

  it('isInWishlist returns false for a product that was not added', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    expect(result.current.isInWishlist('iphone-15-pro')).toBe(false);
  });

  it('isInWishlist returns false after the product is removed', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    act(() => result.current.addToWishlist(PRODUCT_A));
    act(() => result.current.removeFromWishlist('iphone-15-pro'));

    expect(result.current.isInWishlist('iphone-15-pro')).toBe(false);
  });

  // ── wishlistCount ─────────────────────────────────────────────────────────

  it('wishlistCount reflects the current number of items', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    expect(result.current.wishlistCount).toBe(0);

    act(() => result.current.addToWishlist(PRODUCT_A));
    expect(result.current.wishlistCount).toBe(1);

    act(() => result.current.addToWishlist(PRODUCT_B));
    expect(result.current.wishlistCount).toBe(2);

    act(() => result.current.removeFromWishlist('iphone-15-pro'));
    expect(result.current.wishlistCount).toBe(1);
  });

  // ── localStorage persistence ──────────────────────────────────────────────

  it('persists product ids to localStorage when items change', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    act(() => result.current.addToWishlist(PRODUCT_A));

    const stored = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0]).toBe('iphone-15-pro');
  });

  it('persists ids for multiple products to localStorage', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    act(() => result.current.addToWishlist(PRODUCT_A));
    act(() => result.current.addToWishlist(PRODUCT_B));

    const stored = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? '[]');
    expect(stored).toHaveLength(2);
    expect(stored).toContain('iphone-15-pro');
    expect(stored).toContain('samsung-s24');
  });

  it('removes id from localStorage when product is removed', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    act(() => result.current.addToWishlist(PRODUCT_A));
    act(() => result.current.addToWishlist(PRODUCT_B));
    act(() => result.current.removeFromWishlist('iphone-15-pro'));

    const stored = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0]).toBe('samsung-s24');
  });

  it('writes current item ids to localStorage on mount (initial empty state)', () => {
    // WishlistContext stores only product IDs in localStorage; full Product
    // objects are only rehydrated from Supabase when a real user is logged in.
    // Without an authenticated user the context initialises items as [] and
    // the persistence effect writes [] to the key on first render.
    // This verifies the key is created/owned by the context from the start.
    renderHook(() => useWishlist(), { wrapper });

    const stored = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? 'null');
    expect(Array.isArray(stored)).toBe(true);
    expect(stored).toHaveLength(0);
  });

  // ── clearWishlist ─────────────────────────────────────────────────────────

  it('clearWishlist empties the list', async () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    act(() => result.current.addToWishlist(PRODUCT_A));
    act(() => result.current.addToWishlist(PRODUCT_B));

    await act(async () => {
      await result.current.clearWishlist();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.wishlistCount).toBe(0);
  });

  it('clearWishlist clears the ids from localStorage', async () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });

    act(() => result.current.addToWishlist(PRODUCT_A));

    await act(async () => {
      await result.current.clearWishlist();
    });

    const stored = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? '[]');
    expect(stored).toHaveLength(0);
  });

  // ── Error boundary ────────────────────────────────────────────────────────

  it('throws when used outside WishlistProvider', () => {
    const consoleError = console.error;
    console.error = () => {};

    expect(() => renderHook(() => useWishlist())).toThrow(
      'useWishlist must be used within WishlistProvider',
    );

    console.error = consoleError;
  });
});
