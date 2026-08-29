import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db, COL } from '../lib/firebase';

import { useAuth } from './AuthContext';

const ADDRESS_KEY = 'mt_shipping_address';

function readSavedAddress(): ShippingAddress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADDRESS_KEY);
    return raw ? (JSON.parse(raw) as ShippingAddress) : null;
  } catch { return null; }
}

export interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  description: string;
  cost: number;
  estimatedDays: number;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay' | 'klarna' | 'clearpay';
  last4?: string;
  brand?: string;
}

export interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
}

export interface Order {
  id: string;
  userId?: string;
  items: any[];
  shippingAddress: ShippingAddress;
  shippingOption: ShippingOption;
  paymentMethod: PaymentMethod;
  subtotal: number;
  shippingCost: number;
  discount?: number;
  tax: number;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  createdAt: string;
}

interface CheckoutContextType {
  currentStep: 'cart' | 'shipping' | 'payment' | 'review' | 'confirmation';
  setCurrentStep: (step: 'cart' | 'shipping' | 'payment' | 'review' | 'confirmation') => void;
  shippingAddress: ShippingAddress | null;
  setShippingAddress: (address: ShippingAddress) => void;
  shippingOption: ShippingOption | null;
  setShippingOption: (option: ShippingOption) => void;
  paymentMethod: PaymentMethod | null;
  setPaymentMethod: (method: PaymentMethod) => void;
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  orders: Order[];
  createOrder: (order: Order) => Promise<void>;
  lastOrder: Order | null;
}

const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined);

const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: 'standard',
    name: 'Standard Delivery',
    description: 'Delivery in 3-5 business days',
    cost: 0,
    estimatedDays: 5,
  },
  {
    id: 'express',
    name: 'Express Delivery',
    description: 'Delivery in 1-2 business days',
    cost: 9.99,
    estimatedDays: 2,
  },
  {
    id: 'next_day',
    name: 'Next Day Delivery',
    description: 'Delivery by next business day',
    cost: 19.99,
    estimatedDays: 1,
  },
];

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [currentStep, setCurrentStep] = useState<'cart' | 'shipping' | 'payment' | 'review' | 'confirmation'>('cart');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(() => readSavedAddress());
  const [shippingOption, setShippingOption] = useState<ShippingOption | null>(SHIPPING_OPTIONS[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  // Persist the shipping address so the user never has to re-enter
  // it once accepted/edited. Demo seed in CheckoutFlow only fires
  // if this is null on mount, so a real edit always sticks.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (shippingAddress) window.localStorage.setItem(ADDRESS_KEY, JSON.stringify(shippingAddress));
    } catch { /* quota / private mode — ignore */ }
  }, [shippingAddress]);

  // Fetch order history when the user signs in.
  //
  // orders and order_items were two Postgres tables joined on read. In
  // Firestore the line items are an array on the order document instead: they
  // are only ever read with their order, never queried across orders, so a
  // separate collection would just cost extra reads.
  useEffect(() => {
    if (!session || !user || user.isGuest) return;
    let cancelled = false;
    (async () => {
      try {
        // No orderBy: an equality filter plus an orderBy on another field
        // requires a composite index, and Firestore rejects the query without
        // one. Sorting a shopper's own orders in memory avoids that entirely.
        const snap = await getDocs(query(
          collection(db, COL.orders),
          where('userId', '==', user.id),
        ));
        if (cancelled) return;

        const fetched: Order[] = snap.docs.map(d => {
          const row = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            userId: row.userId as string,
            items: (row.items as Order['items']) ?? [],
            shippingAddress: row.shippingAddress as ShippingAddress,
            shippingOption: SHIPPING_OPTIONS[0],
            paymentMethod: { id: 'restored', type: 'card', brand: row.paymentMethod as string },
            subtotal: row.subtotal as number,
            shippingCost: row.shippingCost as number,
            discount: row.discount as number,
            tax: 0,
            total: row.total as number,
            status: row.status as Order['status'],
            createdAt: row.createdAt as string,
          };
        });
        fetched.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
        setOrders(fetched);
      } catch { /* non-fatal — the local order list still renders */ }
    })();
    return () => { cancelled = true; };
  }, [session, user?.id]);

  const MOCK_COUPONS: Coupon[] = [
    { code: 'SAVE10', discountType: 'percentage', value: 10 },
    { code: 'WELCOME20', discountType: 'fixed', value: 20 },
    { code: 'FREESHIP', discountType: 'fixed', value: 9.99 },
  ];

  const applyCoupon = (code: string) => {
    const coupon = MOCK_COUPONS.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (coupon) {
      setAppliedCoupon(coupon);
      return true;
    }
    return false;
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const createOrder = useCallback(async (order: Order) => {
    setOrders(prev => [...prev, order]);
    setAppliedCoupon(null);
    // Persist — fire-and-forget, so a write failure never blocks the
    // confirmation screen for an order the shopper has already paid for.
    try {
      // The server prices the order. This request carries product ids and
      // quantities only — never prices — because a price that arrives from the
      // browser is a price an attacker chooses. /api/orders looks every one up
      // in the catalogue, and `orders` is closed to client writes entirely.
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          items: (order.items as any[]).map((i: any) => ({
            // The base product for pricing; the variant, when there is one,
            // so the server prices the exact configuration that was chosen.
            productId: i.productId ?? i.id,
            variantId: i.variantId ?? null,
            quantity: i.quantity,
            selectedColor: i.selectedColor ?? null,
            selectedStorage: i.selectedStorage ?? null,
            selectedCondition: i.selectedCondition ?? null,
          })),
          shippingAddress: order.shippingAddress,
          shippingOptionId: order.shippingOption?.id ?? 'standard',
          couponCode: appliedCoupon?.code ?? null,
          guestEmail: order.shippingAddress?.email ?? null,
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.error || 'Order could not be placed');
      }
    } catch { /* non-fatal — order still confirmed locally */ }
  }, [appliedCoupon]);

  const lastOrder = orders.length > 0 ? orders[orders.length - 1] : null;

  return (
    <CheckoutContext.Provider value={{
      currentStep,
      setCurrentStep,
      shippingAddress,
      setShippingAddress,
      shippingOption,
      setShippingOption,
      paymentMethod,
      setPaymentMethod,
      appliedCoupon,
      applyCoupon,
      removeCoupon,
      orders,
      createOrder,
      lastOrder,
    }}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error('useCheckout must be used within CheckoutProvider');
  }
  return context;
}

export { SHIPPING_OPTIONS };
