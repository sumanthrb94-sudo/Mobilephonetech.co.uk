import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { CheckoutProvider, useCheckout, SHIPPING_OPTIONS } from '../../context/CheckoutContext';
import type { ShippingAddress, PaymentMethod, Order } from '../../context/CheckoutContext';

// Mock Supabase so order saves are no-ops
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'mock-order-id' }, error: null }) }) }),
    }),
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CheckoutProvider>{children}</CheckoutProvider>
);

const MOCK_ADDRESS: ShippingAddress = {
  fullName: 'John Doe',
  email: 'john@example.com',
  phone: '07700900000',
  addressLine1: '10 Test Street',
  city: 'London',
  postalCode: 'SW1A 1AA',
  country: 'United Kingdom',
};

const MOCK_PAYMENT: PaymentMethod = {
  id: 'pm_mock',
  type: 'card',
  last4: '4242',
  brand: 'Visa',
};

describe('CheckoutContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── Initial state ─────────────────────────────────────
  it('starts at cart step', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    expect(result.current.currentStep).toBe('cart');
  });

  it('starts with default standard shipping option selected', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    expect(result.current.shippingOption).not.toBeNull();
    expect(result.current.shippingOption!.id).toBe('standard');
  });

  it('starts with no applied coupon', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    expect(result.current.appliedCoupon).toBeNull();
  });

  it('starts with no payment method', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    expect(result.current.paymentMethod).toBeNull();
  });

  it('throws when used outside CheckoutProvider', () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => renderHook(() => useCheckout())).toThrow();
    console.error = consoleError;
  });

  // ── Step navigation ───────────────────────────────────
  it('setCurrentStep changes the current step', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    act(() => result.current.setCurrentStep('shipping'));
    expect(result.current.currentStep).toBe('shipping');
  });

  it('can navigate through all steps', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    const steps = ['cart', 'shipping', 'payment', 'review', 'confirmation'] as const;
    for (const step of steps) {
      act(() => result.current.setCurrentStep(step));
      expect(result.current.currentStep).toBe(step);
    }
  });

  // ── Shipping address ──────────────────────────────────
  it('saves shipping address', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    act(() => result.current.setShippingAddress(MOCK_ADDRESS));
    expect(result.current.shippingAddress).toEqual(MOCK_ADDRESS);
  });

  it('persists shipping address to localStorage', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    act(() => result.current.setShippingAddress(MOCK_ADDRESS));
    const stored = localStorage.getItem('mt_shipping_address');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.email).toBe('john@example.com');
  });

  // ── Shipping options ──────────────────────────────────
  it('SHIPPING_OPTIONS export has three options', () => {
    expect(SHIPPING_OPTIONS).toHaveLength(3);
  });

  it('standard shipping is free', () => {
    const standard = SHIPPING_OPTIONS.find(o => o.id === 'standard');
    expect(standard!.cost).toBe(0);
  });

  it('next_day shipping costs more than express', () => {
    const express  = SHIPPING_OPTIONS.find(o => o.id === 'express');
    const nextDay  = SHIPPING_OPTIONS.find(o => o.id === 'next_day');
    expect(nextDay!.cost).toBeGreaterThan(express!.cost);
  });

  it('setShippingOption updates the option', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    const express = SHIPPING_OPTIONS[1];
    act(() => result.current.setShippingOption(express));
    expect(result.current.shippingOption!.id).toBe('express');
  });

  // ── Payment method ────────────────────────────────────
  it('setPaymentMethod saves the method', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    act(() => result.current.setPaymentMethod(MOCK_PAYMENT));
    expect(result.current.paymentMethod).toEqual(MOCK_PAYMENT);
  });

  // ── Coupons ───────────────────────────────────────────
  it('applyCoupon returns true for valid code SAVE10', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    let applied = false;
    act(() => { applied = result.current.applyCoupon('SAVE10'); });
    expect(applied).toBe(true);
    expect(result.current.appliedCoupon).not.toBeNull();
    expect(result.current.appliedCoupon!.code).toBe('SAVE10');
  });

  it('applyCoupon accepts code case-insensitively', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    let applied = false;
    act(() => { applied = result.current.applyCoupon('save10'); });
    expect(applied).toBe(true);
  });

  it('applyCoupon returns false for invalid code', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    let applied = true;
    act(() => { applied = result.current.applyCoupon('INVALID99'); });
    expect(applied).toBe(false);
    expect(result.current.appliedCoupon).toBeNull();
  });

  it('WELCOME20 is a fixed £20 discount', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    act(() => result.current.applyCoupon('WELCOME20'));
    expect(result.current.appliedCoupon!.discountType).toBe('fixed');
    expect(result.current.appliedCoupon!.value).toBe(20);
  });

  it('removeCoupon clears the applied coupon', () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    act(() => result.current.applyCoupon('SAVE10'));
    act(() => result.current.removeCoupon());
    expect(result.current.appliedCoupon).toBeNull();
  });

  // ── Orders ────────────────────────────────────────────
  it('createOrder adds order to orders list', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    const order: Order = {
      id: 'order-001',
      items: [],
      shippingAddress: MOCK_ADDRESS,
      shippingOption: SHIPPING_OPTIONS[0],
      paymentMethod: MOCK_PAYMENT,
      subtotal: 649,
      shippingCost: 0,
      tax: 0,
      total: 649,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    await act(async () => { await result.current.createOrder(order); });
    expect(result.current.orders).toHaveLength(1);
    expect(result.current.orders[0].id).toBe('order-001');
  });

  it('lastOrder reflects the most recent order', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    const order: Order = {
      id: 'order-last',
      items: [],
      shippingAddress: MOCK_ADDRESS,
      shippingOption: SHIPPING_OPTIONS[0],
      paymentMethod: MOCK_PAYMENT,
      subtotal: 100,
      shippingCost: 0,
      tax: 0,
      total: 100,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    await act(async () => { await result.current.createOrder(order); });
    expect(result.current.lastOrder!.id).toBe('order-last');
  });

  it('createOrder clears applied coupon', async () => {
    const { result } = renderHook(() => useCheckout(), { wrapper });
    act(() => result.current.applyCoupon('SAVE10'));
    const order: Order = {
      id: 'order-002',
      items: [],
      shippingAddress: MOCK_ADDRESS,
      shippingOption: SHIPPING_OPTIONS[0],
      paymentMethod: MOCK_PAYMENT,
      subtotal: 100,
      shippingCost: 0,
      tax: 0,
      total: 100,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    await act(async () => { await result.current.createOrder(order); });
    expect(result.current.appliedCoupon).toBeNull();
  });
});
