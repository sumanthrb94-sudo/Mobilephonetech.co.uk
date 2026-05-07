import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
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

    it('createOrder calls supabase.from("orders").insert with correct fields', async () => {
      const { supabase } = await import('../../lib/supabase');

      // Build a spy chain: from() → insert() → select() → single()
      const singleSpy = vi.fn().mockResolvedValue({
        data: { id: 'supabase-order-id' },
        error: null,
      });
      const selectSpy = vi.fn().mockReturnValue({ single: singleSpy });
      const insertSpy = vi.fn().mockReturnValue({ select: selectSpy });
      const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
        insert: insertSpy,
      } as any);

      const order = makeOrder({
        id: 'order-spy-001',
        userId: 'user-abc',
        subtotal: 649,
        shippingCost: 9.99,
        discount: 20,
        total: 638.99,
        status: 'confirmed',
        paymentMethod: { ...MOCK_PAYMENT, brand: 'Visa' },
      });

      const { result } = renderHook(() => useCheckout(), { wrapper });
      await act(async () => { await result.current.createOrder(order); });

      // The first call to supabase.from should target 'orders'
      expect(fromSpy).toHaveBeenCalledWith('orders');
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'order-spy-001',
          user_id: 'user-abc',
          guest_email: MOCK_ADDRESS.email,
          status: 'confirmed',
          subtotal: 649,
          delivery_cost: 9.99,
          discount: 20,
          total: 638.99,
          delivery_address: MOCK_ADDRESS,
          payment_method: 'Visa',
        })
      );
    });

    it('createOrder inserts order_items for each line item', async () => {
      const { supabase } = await import('../../lib/supabase');

      const orderItemsInsertSpy = vi.fn().mockResolvedValue({ error: null });

      // from('orders') returns the insert-chain; from('order_items') returns bare insert
      const fromSpy = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'returned-order-id' },
                  error: null,
                }),
              }),
            }),
          } as any;
        }
        // order_items
        return { insert: orderItemsInsertSpy } as any;
      });

      const order = makeOrder({
        id: 'order-items-001',
        items: [
          {
            id: 'iphone-15-pro',
            model: 'iPhone 15 Pro',
            brand: 'Apple',
            price: 649,
            originalPrice: 899,
            quantity: 1,
            imageUrl: '/img/iphone.jpg',
            selectedColor: 'Black',
            selectedStorage: '256GB',
            selectedCondition: 'Excellent',
          },
        ],
      });

      const { result } = renderHook(() => useCheckout(), { wrapper });
      await act(async () => { await result.current.createOrder(order); });

      expect(fromSpy).toHaveBeenCalledWith('order_items');
      expect(orderItemsInsertSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            order_id: 'returned-order-id',
            product_id: 'iphone-15-pro',
            model: 'iPhone 15 Pro',
            brand: 'Apple',
            price: 649,
            quantity: 1,
          }),
        ])
      );
    });

    it('createOrder succeeds locally even when Supabase insert throws', async () => {
      const { supabase } = await import('../../lib/supabase');
      vi.spyOn(supabase, 'from').mockImplementation(() => {
        throw new Error('Network failure');
      });

      const { result } = renderHook(() => useCheckout(), { wrapper });
      // Should not throw — createOrder catches Supabase errors
      await act(async () => { await result.current.createOrder(makeOrder({ id: 'order-offline' })); });
      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0].id).toBe('order-offline');
    });
  });

  // ── Order history fetch from Supabase ─────────────────────────────────────

  describe('order history fetch from Supabase', () => {
    it('fetches orders from Supabase on mount when user is authenticated', async () => {
      const { supabase } = await import('../../lib/supabase');

      // Simulate an authenticated session returned by getSession
      const fakeUser = {
        id: 'user-real-001',
        email: 'real@example.com',
        user_metadata: { full_name: 'Real User' },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as any;

      const fakeSession = {
        access_token: 'fake-access-token',
        refresh_token: 'fake-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        user: fakeUser,
      } as any;

      vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce({
        data: { session: fakeSession },
        error: null,
      });

      // Fake order row returned by supabase.from('orders')...
      const fakeOrderRow = {
        id: 'fetched-order-001',
        user_id: 'user-real-001',
        status: 'delivered',
        subtotal: 399,
        delivery_cost: 0,
        discount: 0,
        total: 399,
        delivery_address: MOCK_ADDRESS,
        payment_method: 'MasterCard',
        created_at: '2026-01-15T10:00:00.000Z',
        order_items: [
          {
            product_id: 'galaxy-s24',
            model: 'Galaxy S24',
            brand: 'Samsung',
            price: 399,
            original_price: 549,
            quantity: 1,
            image_url: '/img/s24.jpg',
            selected_color: 'Phantom Black',
            selected_storage: '128GB',
            selected_condition: 'Good',
          },
        ],
      };

      // Build a query-chain spy: from('orders').select(...).eq(...).order(...)
      const orderSpy = vi.fn().mockResolvedValue({ data: [fakeOrderRow], error: null });
      const eqSpy = vi.fn().mockReturnValue({ order: orderSpy });
      const selectSpy = vi.fn().mockReturnValue({ eq: eqSpy });

      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'orders') {
          return { select: selectSpy } as any;
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null }),
            }),
          }),
        } as any;
      });

      const { result } = renderHook(() => useCheckout(), { wrapper });

      // Wait for auth loading + the async fetch effect to complete
      await waitFor(() => {
        expect(result.current.orders.length).toBeGreaterThan(0);
      });

      expect(result.current.orders).toHaveLength(1);
      const fetchedOrder = result.current.orders[0];
      expect(fetchedOrder.id).toBe('fetched-order-001');
      expect(fetchedOrder.userId).toBe('user-real-001');
      expect(fetchedOrder.status).toBe('delivered');
      expect(fetchedOrder.total).toBe(399);
      expect(fetchedOrder.shippingAddress).toEqual(MOCK_ADDRESS);
    });

    it('populates order.items from the nested order_items array', async () => {
      const { supabase } = await import('../../lib/supabase');

      const fakeUser = {
        id: 'user-items-test',
        email: 'items@example.com',
        user_metadata: {},
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as any;

      vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'tok',
            refresh_token: 'rtok',
            expires_in: 3600,
            token_type: 'bearer',
            user: fakeUser,
          } as any,
        },
        error: null,
      });

      const fakeRow = {
        id: 'order-with-items',
        user_id: 'user-items-test',
        status: 'confirmed',
        subtotal: 649,
        delivery_cost: 9.99,
        discount: 0,
        total: 658.99,
        delivery_address: MOCK_ADDRESS,
        payment_method: 'Visa',
        created_at: '2026-02-10T12:00:00.000Z',
        order_items: [
          {
            product_id: 'iphone-15-pro',
            model: 'iPhone 15 Pro',
            brand: 'Apple',
            price: 649,
            original_price: 899,
            quantity: 2,
            image_url: '/img/iphone15.jpg',
            selected_color: 'Natural Titanium',
            selected_storage: '512GB',
            selected_condition: 'Excellent',
          },
        ],
      };

      const orderSpy = vi.fn().mockResolvedValue({ data: [fakeRow], error: null });
      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ order: orderSpy }),
            }),
          } as any;
        }
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'y' }, error: null }),
            }),
          }),
        } as any;
      });

      const { result } = renderHook(() => useCheckout(), { wrapper });
      await waitFor(() => expect(result.current.orders.length).toBeGreaterThan(0));

      const items = result.current.orders[0].items;
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('iphone-15-pro');
      expect(items[0].model).toBe('iPhone 15 Pro');
      expect(items[0].quantity).toBe(2);
      expect(items[0].selectedColor).toBe('Natural Titanium');
      expect(items[0].selectedStorage).toBe('512GB');
    });

    it('does not fetch orders when there is no authenticated session', async () => {
      const { supabase } = await import('../../lib/supabase');

      // getSession returns null (the default baseline mock behaviour)
      vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const fromSpy = vi.spyOn(supabase, 'from');

      const { result } = renderHook(() => useCheckout(), { wrapper });

      // Let all async effects settle
      await waitFor(() => expect(result.current.orders).toBeDefined());

      // from() should never have been called for 'orders' with a select chain
      const ordersFetchCalls = fromSpy.mock.calls.filter(([table]) => table === 'orders');
      expect(ordersFetchCalls).toHaveLength(0);
      expect(result.current.orders).toHaveLength(0);
    });

    it('does not fetch orders when the user is a guest', async () => {
      // Guest users set via continueAsGuest — they have no Supabase session,
      // so the effect guard (if (!session || !user || user.isGuest)) should bail.
      const { supabase } = await import('../../lib/supabase');
      const fromSpy = vi.spyOn(supabase, 'from');

      // Render both hooks together inside the same wrapper tree so they share context
      const { result: authResult } = renderHook(
        () => ({ auth: useAuth(), checkout: useCheckout() }),
        { wrapper }
      );

      act(() => authResult.current.auth.continueAsGuest('guest@example.com'));
      await waitFor(() => expect(authResult.current.auth.user?.isGuest).toBe(true));

      const ordersFetchCalls = fromSpy.mock.calls.filter(([table]) => table === 'orders');
      expect(ordersFetchCalls).toHaveLength(0);
      expect(authResult.current.checkout.orders).toHaveLength(0);
    });

    it('handles a Supabase error during fetch gracefully (orders stays empty)', async () => {
      const { supabase } = await import('../../lib/supabase');

      const fakeUser = {
        id: 'user-err-001',
        email: 'err@example.com',
        user_metadata: {},
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as any;

      vi.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'tok',
            refresh_token: 'rtok',
            expires_in: 3600,
            token_type: 'bearer',
            user: fakeUser,
          } as any,
        },
        error: null,
      });

      // Supabase returns an error
      const orderSpy = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } });
      vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({ order: orderSpy }),
            }),
          } as any;
        }
        return {} as any;
      });

      const { result } = renderHook(() => useCheckout(), { wrapper });

      // Give the effect time to run and handle the error
      await waitFor(() => expect(result.current.orders).toBeDefined());
      // A short extra wait to allow the async effect to complete
      await new Promise(r => setTimeout(r, 50));

      expect(result.current.orders).toHaveLength(0);
    });
  });
});
