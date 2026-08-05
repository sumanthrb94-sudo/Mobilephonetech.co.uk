import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider } from '../../context/AuthContext';
import { CheckoutProvider, useCheckout, SHIPPING_OPTIONS } from '../../context/CheckoutContext';
import type { Order, ShippingAddress, PaymentMethod } from '../../context/CheckoutContext';

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
    id: 'ORD-1', items: [], shippingAddress: ADDRESS, shippingOption: SHIPPING_OPTIONS[0],
    paymentMethod: PAYMENT, subtotal: 10, shippingCost: 0, discount: 0, tax: 0, total: 10,
    status: 'confirmed', createdAt: new Date().toISOString(), ...over,
  } as Order;
}

beforeEach(() => vi.clearAllMocks());

describe('order persistence', () => {
  it('writes userId, which the security rules require and order history filters on', async () => {
    const { setDoc } = await import('firebase/firestore');
    const { result } = renderHook(() => useCheckout(), { wrapper });

    await act(async () => { await result.current.createOrder(order({ userId: 'uid-123' })); });

    const written = vi.mocked(setDoc).mock.calls.at(-1)?.[1] as Record<string, unknown>;
    // firestore.rules: allow create if request.resource.data.userId == request.auth.uid.
    // A missing userId means the write is rejected and the order silently vanishes.
    expect(written.userId).toBe('uid-123');
  });

  it('falls back to null for a guest rather than undefined, which Firestore rejects', async () => {
    const { setDoc } = await import('firebase/firestore');
    const { result } = renderHook(() => useCheckout(), { wrapper });

    await act(async () => { await result.current.createOrder(order({ userId: undefined })); });

    const written = vi.mocked(setDoc).mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(written.userId).toBeNull();
    expect(Object.values(written).every(v => v !== undefined)).toBe(true);
  });
});
