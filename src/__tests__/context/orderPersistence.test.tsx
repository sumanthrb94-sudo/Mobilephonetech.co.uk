import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider } from '../../context/AuthContext';
import { CheckoutProvider, useCheckout, SHIPPING_OPTIONS } from '../../context/CheckoutContext';
import type { Order, ShippingAddress, PaymentMethod } from '../../context/CheckoutContext';

/**
 * Orders are created by the server, not the browser.
 *
 * They used to be written straight to Firestore from here, which meant every
 * price on the document came from the client — an adversarial audit bought a
 * £759 phone for a penny by editing the request. Firestore rules cannot fix
 * that: the rules language has no loop with which to re-price a basket.
 *
 * So `orders` is now closed to client writes and this context POSTs to
 * /api/orders instead. These tests guard the property that makes that work:
 * the request carries WHAT the customer wants, never what it should cost.
 */

const ADDRESS: ShippingAddress = {
  fullName: 'A B', email: 'a@b.c', phone: '1', addressLine1: '1 St',
  city: 'London', postalCode: 'E1', country: 'UK',
} as ShippingAddress;
const PAYMENT: PaymentMethod = { id: 'p', type: 'card', brand: 'Visa' } as PaymentMethod;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider><CheckoutProvider>{children}</CheckoutProvider></AuthProvider>
);

function order(over: Partial<Order> = {}): Order {
  return {
    id: 'ORD-1',
    items: [
      { id: 'apple-iphone-17', model: 'iPhone 17', brand: 'Apple', price: 759, quantity: 1 },
    ],
    shippingAddress: ADDRESS, shippingOption: SHIPPING_OPTIONS[0],
    paymentMethod: PAYMENT, subtotal: 759, shippingCost: 0, discount: 0, tax: 0, total: 759,
    status: 'confirmed', createdAt: new Date().toISOString(), ...over,
  } as Order;
}

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  fetchSpy = vi.fn(async () => ({
    ok: true,
    json: async () => ({ order: { id: 'ORD-SERVER', total: 910.8 } }),
  }));
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => vi.unstubAllGlobals());

const lastBody = () => JSON.parse(fetchSpy.mock.calls.at(-1)?.[1]?.body ?? '{}');

describe('order creation', () => {
  it('posts to the server rather than writing Firestore directly', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await act(async () => { await result.current.createOrder(order()); });

    expect(fetchSpy).toHaveBeenCalled();
    expect(fetchSpy.mock.calls.at(-1)?.[0]).toBe('/api/orders');
    expect(fetchSpy.mock.calls.at(-1)?.[1]?.method).toBe('POST');
  });

  it('never writes an order document from the client', async () => {
    const { setDoc } = await import('firebase/firestore');
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await act(async () => { await result.current.createOrder(order()); });

    // The security rules refuse client order writes outright, so any setDoc
    // here would be a silently failing write — and a sign the old path is back.
    const orderWrites = vi.mocked(setDoc).mock.calls.filter(
      c => JSON.stringify(c[1] ?? {}).includes('shippingAddress'),
    );
    expect(orderWrites).toHaveLength(0);
  });

  it('sends no prices — that is the whole point', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await act(async () => { await result.current.createOrder(order()); });

    const body = lastBody();
    for (const item of body.items) {
      expect(item).not.toHaveProperty('price');
      expect(item).not.toHaveProperty('originalPrice');
    }
    // Nor any basket-level money the server should be computing itself.
    expect(body).not.toHaveProperty('total');
    expect(body).not.toHaveProperty('subtotal');
    expect(body).not.toHaveProperty('tax');
    expect(body).not.toHaveProperty('discount');
  });

  it('sends the product id and quantity the customer chose', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await act(async () => { await result.current.createOrder(order()); });

    expect(lastBody().items).toEqual([
      expect.objectContaining({ productId: 'apple-iphone-17', quantity: 1 }),
    ]);
  });

  it('sends no status — the server forces pending', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await act(async () => { await result.current.createOrder(order({ status: 'delivered' } as Partial<Order>)); });

    expect(lastBody()).not.toHaveProperty('status');
  });

  it('passes the delivery address and chosen shipping option', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    await act(async () => { await result.current.createOrder(order()); });

    const body = lastBody();
    expect(body.shippingAddress.postalCode).toBe('E1');
    expect(body.shippingOptionId).toBe(SHIPPING_OPTIONS[0].id);
  });

  it('still confirms the order locally when the server call fails', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'nope' }) });
    const { result } = renderHook(() => useCheckout(), { wrapper });

    // The shopper has already been shown a confirmation; a persistence failure
    // must not throw into the UI on top of it.
    await act(async () => {
      await expect(result.current.createOrder(order())).resolves.toBeUndefined();
    });
    expect(result.current.orders).toHaveLength(1);
  });
});
