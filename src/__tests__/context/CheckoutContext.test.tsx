import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider } from '../../context/AuthContext';
import {
  CheckoutProvider,
  useCheckout,
  SHIPPING_OPTIONS,
} from '../../context/CheckoutContext';
import type { ShippingAddress, PaymentMethod, Order } from '../../context/CheckoutContext';

// The global setup.ts already provides a baseline Supabase mock.
// Individual tests that need specific Supabase behaviour use vi.spyOn
// against the shared module instance — matching the pattern used in
// AuthContext.test.tsx.

// Both providers are required because CheckoutProvider calls useAuth().
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <CheckoutProvider>{children}</CheckoutProvider>
  </AuthProvider>
);

// ── Shared fixtures ───────────────────────────────────────────────────────────

const MOCK_ADDRESS: ShippingAddress = {
  fullName: 'Jane Smith',
  email: 'jane@example.com',
  phone: '07700900123',
  addressLine1: '42 Test Lane',
  city: 'Manchester',
  postalCode: 'M1 1AA',
  country: 'United Kingdom',
};

const MOCK_PAYMENT: PaymentMethod = {
  id: 'pm_test_001',
  type: 'card',
  last4: '4242',
  brand: 'Visa',
};

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-test-001',
    items: [],
    shippingAddress: MOCK_ADDRESS,
    shippingOption: SHIPPING_OPTIONS[0],
    paymentMethod: MOCK_PAYMENT,
    subtotal: 499,
    shippingCost: 0,
    tax: 0,
    total: 499,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('CheckoutContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── throws when used outside CheckoutProvider ─────────────────────────────

  it('throws when used outside CheckoutProvider', () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => renderHook(() => useCheckout())).toThrow(
      'useCheckout must be used within CheckoutProvider'
    );
    console.error = consoleError;
  });

  // ── Step navigation ───────────────────────────────────────────────────────

  describe('step navigation', () => {
    it('currentStep starts as "cart"', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      expect(result.current.currentStep).toBe('cart');
    });

    it('setCurrentStep changes the step to "shipping"', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      act(() => result.current.setCurrentStep('shipping'));
      expect(result.current.currentStep).toBe('shipping');
    });

    it('setCurrentStep changes the step to "payment"', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      act(() => result.current.setCurrentStep('payment'));
      expect(result.current.currentStep).toBe('payment');
    });

    it('setCurrentStep changes the step to "review"', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      act(() => result.current.setCurrentStep('review'));
      expect(result.current.currentStep).toBe('review');
    });

    it('setCurrentStep changes the step to "confirmation"', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      act(() => result.current.setCurrentStep('confirmation'));
      expect(result.current.currentStep).toBe('confirmation');
    });

    it('can navigate forward and then backward through steps', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      act(() => result.current.setCurrentStep('confirmation'));
      expect(result.current.currentStep).toBe('confirmation');
      act(() => result.current.setCurrentStep('cart'));
      expect(result.current.currentStep).toBe('cart');
    });
  });

  // ── Shipping address ──────────────────────────────────────────────────────

  describe('shipping address', () => {
    it('shippingAddress is null by default (empty localStorage)', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      expect(result.current.shippingAddress).toBeNull();
    });

    it('setShippingAddress stores the address in state', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      act(() => result.current.setShippingAddress(MOCK_ADDRESS));
      expect(result.current.shippingAddress).toEqual(MOCK_ADDRESS);
    });

    it('address persists to localStorage under key "mt_shipping_address"', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      act(() => result.current.setShippingAddress(MOCK_ADDRESS));
      const raw = localStorage.getItem('mt_shipping_address');
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toEqual(MOCK_ADDRESS);
    });

    it('address loads from localStorage on mount', () => {
      // Pre-seed localStorage before the hook mounts
      localStorage.setItem('mt_shipping_address', JSON.stringify(MOCK_ADDRESS));
      const { result } = renderHook(() => useCheckout(), { wrapper });
      expect(result.current.shippingAddress).toEqual(MOCK_ADDRESS);
    });

    it('handles corrupt localStorage data gracefully (returns null)', () => {
      localStorage.setItem('mt_shipping_address', 'not-valid-json{{{');
      const { result } = renderHook(() => useCheckout(), { wrapper });
      expect(result.current.shippingAddress).toBeNull();
    });
  });

  // ── Shipping options ──────────────────────────────────────────────────────

  describe('shipping options', () => {
    it('shippingOption defaults to standard (cost: 0)', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      expect(result.current.shippingOption).not.toBeNull();
      expect(result.current.shippingOption!.id).toBe('standard');
      expect(result.current.shippingOption!.cost).toBe(0);
    });

    it('setShippingOption changes the active option', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      const express = SHIPPING_OPTIONS.find(o => o.id === 'express')!;
      act(() => result.current.setShippingOption(express));
      expect(result.current.shippingOption!.id).toBe('express');
    });

    it('setShippingOption updates cost correctly for next_day', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      const nextDay = SHIPPING_OPTIONS.find(o => o.id === 'next_day')!;
      act(() => result.current.setShippingOption(nextDay));
      expect(result.current.shippingOption!.cost).toBe(19.99);
    });
  });

  // ── Coupon ────────────────────────────────────────────────────────────────

  describe('coupon', () => {
    it('appliedCoupon starts as null', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      expect(result.current.appliedCoupon).toBeNull();
    });

    it('applyCoupon("SAVE10") returns true and sets coupon with percentage discount', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      let returnValue = false;
      act(() => { returnValue = result.current.applyCoupon('SAVE10'); });
      expect(returnValue).toBe(true);
      expect(result.current.appliedCoupon).not.toBeNull();
      expect(result.current.appliedCoupon!.code).toBe('SAVE10');
      expect(result.current.appliedCoupon!.discountType).toBe('percentage');
      expect(result.current.appliedCoupon!.value).toBe(10);
    });

    it('applyCoupon("WELCOME20") returns true and sets coupon with fixed discount', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      let returnValue = false;
      act(() => { returnValue = result.current.applyCoupon('WELCOME20'); });
      expect(returnValue).toBe(true);
      expect(result.current.appliedCoupon).not.toBeNull();
      expect(result.current.appliedCoupon!.code).toBe('WELCOME20');
      expect(result.current.appliedCoupon!.discountType).toBe('fixed');
      expect(result.current.appliedCoupon!.value).toBe(20);
    });

    it('applyCoupon("BADCODE") returns false and leaves appliedCoupon null', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      let returnValue = true;
      act(() => { returnValue = result.current.applyCoupon('BADCODE'); });
      expect(returnValue).toBe(false);
      expect(result.current.appliedCoupon).toBeNull();
    });

    it('removeCoupon clears an applied coupon', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      act(() => result.current.applyCoupon('SAVE10'));
      expect(result.current.appliedCoupon).not.toBeNull();
      act(() => result.current.removeCoupon());
      expect(result.current.appliedCoupon).toBeNull();
    });

    it('applyCoupon is case-insensitive — "save10" matches SAVE10', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      let returnValue = false;
      act(() => { returnValue = result.current.applyCoupon('save10'); });
      expect(returnValue).toBe(true);
      expect(result.current.appliedCoupon).not.toBeNull();
    });

    it('applyCoupon is case-insensitive — "Welcome20" matches WELCOME20', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      let returnValue = false;
      act(() => { returnValue = result.current.applyCoupon('Welcome20'); });
      expect(returnValue).toBe(true);
      expect(result.current.appliedCoupon!.code).toBe('WELCOME20');
    });

    it('applyCoupon replaces an existing coupon with a new one', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      act(() => result.current.applyCoupon('SAVE10'));
      act(() => result.current.applyCoupon('WELCOME20'));
      expect(result.current.appliedCoupon!.code).toBe('WELCOME20');
    });
  });

  // ── Order creation ────────────────────────────────────────────────────────

  describe('order creation', () => {
    it('orders array starts empty', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      expect(result.current.orders).toHaveLength(0);
    });

    it('lastOrder is null before any orders are created', () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      expect(result.current.lastOrder).toBeNull();
    });

    it('createOrder adds an order to the orders array', async () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      const order = makeOrder({ id: 'order-add-001' });
      await act(async () => { await result.current.createOrder(order); });
      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0].id).toBe('order-add-001');
    });

    it('createOrder accumulates multiple orders in the array', async () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      await act(async () => { await result.current.createOrder(makeOrder({ id: 'order-a' })); });
      await act(async () => { await result.current.createOrder(makeOrder({ id: 'order-b' })); });
      expect(result.current.orders).toHaveLength(2);
    });

    it('lastOrder reflects the most recently created order', async () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      await act(async () => { await result.current.createOrder(makeOrder({ id: 'order-first' })); });
      await act(async () => { await result.current.createOrder(makeOrder({ id: 'order-last' })); });
      expect(result.current.lastOrder!.id).toBe('order-last');
    });

    it('createOrder clears the applied coupon', async () => {
      const { result } = renderHook(() => useCheckout(), { wrapper });
      act(() => result.current.applyCoupon('SAVE10'));
      expect(result.current.appliedCoupon).not.toBeNull();
      await act(async () => { await result.current.createOrder(makeOrder()); });
      expect(result.current.appliedCoupon).toBeNull();
    });
    it('createOrder posts to the server instead of writing Firestore', async () => {
      const { setDoc } = await import('firebase/firestore');
      const fetchSpy = vi.fn(async (..._args: unknown[]) => ({ ok: true, json: async () => ({ order: { id: 'ORD-SERVER' } }) }));
      vi.stubGlobal('fetch', fetchSpy);

      const { result } = renderHook(() => useCheckout(), { wrapper });
      await act(async () => {
        await result.current.createOrder(makeOrder({ id: 'order-spy-001', userId: 'user-abc' }));
      });

      // Prices from the browser are prices an attacker chooses, so `orders` is
      // closed to client writes and the server does the pricing.
      expect(fetchSpy.mock.calls.at(-1)?.[0]).toBe('/api/orders');
      const orderWrites = vi.mocked(setDoc).mock.calls.filter(
        c => JSON.stringify(c[1] ?? {}).includes('shippingAddress'),
      );
      expect(orderWrites).toHaveLength(0);
      vi.unstubAllGlobals();
    });

    it('createOrder succeeds locally even when the Firestore write throws', async () => {
      const { setDoc } = await import('firebase/firestore');
      vi.mocked(setDoc).mockRejectedValueOnce(new Error('Network failure'));

      const { result } = renderHook(() => useCheckout(), { wrapper });
      // Must not throw: the shopper has already paid, so a failed write cannot
      // be allowed to break the confirmation screen.
      await act(async () => { await result.current.createOrder(makeOrder({ id: 'order-offline' })); });
      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0].id).toBe('order-offline');
    });
  });

  // ── Order history fetch from Firestore ────────────────────────────────────

  describe('order history fetch from Firestore', () => {
    it('does not query when signed out', async () => {
      const { getDocs } = await import('firebase/firestore');
      vi.mocked(getDocs).mockClear();

      renderHook(() => useCheckout(), { wrapper });
      await waitFor(() => expect(vi.mocked(getDocs)).not.toHaveBeenCalled());
    });

    it('survives a rejected history read without breaking the provider', async () => {
      const { getDocs } = await import('firebase/firestore');
      vi.mocked(getDocs).mockRejectedValueOnce(new Error('permission-denied'));

      const { result } = renderHook(() => useCheckout(), { wrapper });
      await waitFor(() => expect(result.current.currentStep).toBeDefined());
      expect(result.current.orders).toEqual([]);
    });
  });
});
