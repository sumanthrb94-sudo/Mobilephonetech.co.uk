import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db, COL } from '../lib/firebase';

import { useAuth } from './AuthContext';

const ADDRESS_KEY = 'mt_shipping_address';

/**
 * A saved address belongs to one account, and now says so.
 *
 * It used to be stored as a bare address under a single browser-wide key,
 * owned by nobody. The checkout form reads the saved address ahead of the
 * signed-in user's own details (`shippingAddress?.email || user?.email`),
 * so signing in as a different person still showed the previous one's name,
 * email, phone and home address. On a shared device — a counter tablet, a
 * family phone — that is one customer's address prefilled for the next.
 *
 * `owner` is the uid that saved it, or null for a guest. An address saved
 * by anyone else is ignored rather than shown.
 *
 * This also settles the other half of that history. A since-removed mount
 * effect seeded every new shopper's form with an invented demo profile
 * (Alex Morgan, 221B Baker Street, 07700 900123) and wrote it through to
 * storage like a real address. The cleanup written for it matched all four
 * of those fields exactly — so the moment a shopper corrected any one of
 * them, their own email, a typo in the street, it stopped being recognised
 * and stuck permanently. Anything still in the old ownerless shape is
 * discarded on read instead, which catches every edited copy the exact
 * match could not.
 */
interface SavedAddress {
  owner: string | null;
  address: ShippingAddress;
}

function readSavedAddress(owner: string | null): ShippingAddress | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADDRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedAddress>;

    // The old ownerless shape: pre-dates per-account scoping, and is how the
    // demo profile above got saved. Never trusted, and cleared so it stops
    // being re-read on every load.
    if (!parsed || typeof parsed !== 'object' || !('owner' in parsed) || !parsed.address) {
      window.localStorage.removeItem(ADDRESS_KEY);
      return null;
    }

    return parsed.owner === owner ? parsed.address : null;
  } catch { return null; }
}

function writeSavedAddress(owner: string | null, address: ShippingAddress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ADDRESS_KEY, JSON.stringify({ owner, address } satisfies SavedAddress));
  } catch { /* quota / private mode — ignore */ }
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
  /**
   * PayPal is the only gateway, and this union is how the compiler keeps it
   * that way: adding a method means changing this line on purpose, not
   * quietly constructing one somewhere in a component.
   */
  type: 'paypal';
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

/** What the server returns once it has actually stored the order. */
interface OrderResponse {
  order?: { id?: string; contactEmail?: string; copyEmail?: string | null };
  confirmationEmail?: { sent?: boolean; skipped?: string; copySent?: boolean };
}

/**
 * The outcome of a placed order.
 *
 * `confirmationEmailSent` is reported rather than assumed: the API sends the
 * receipt on a best-effort basis and says plainly whether it went, so the
 * confirmation screen can stop telling every shopper an email is on its way.
 */
export interface OrderResult {
  order: Order;
  confirmationEmailSent: boolean;
  /**
   * The addresses the receipt actually reached — the account address, plus the
   * one typed at checkout when it differs. Reported rather than inferred: the
   * confirmation screen used to name whichever address was in the form, which
   * is not necessarily where anything was sent.
   */
  confirmationSentTo: string[];
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
  createOrder: (order: Order) => Promise<OrderResult>;
  /**
   * Record an order the server already created and was already paid for
   * (the PayPal path), without POSTing again. createOrder is for the card
   * path where this context drives the write; here the money and the write
   * both happened server-side during capture, so this only mirrors the
   * result into local state so the confirmation screen can read it.
   */
  recordServerOrder: (order: Order) => void;
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
  // Who the saved address belongs to. A guest has no account to file one
  // under, so guests share the null bucket — they can still refresh
  // mid-checkout without losing what they typed.
  const addressOwner = user && !user.isGuest ? user.id : null;

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(
    () => readSavedAddress(addressOwner),
  );
  const [shippingOption, setShippingOption] = useState<ShippingOption | null>(SHIPPING_OPTIONS[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  /**
   * Swap to this account's own saved address the moment the account changes.
   *
   * Adjusted during render rather than in an effect on purpose: an effect
   * would let one render commit with the previous occupant's address still
   * in state, and the persist effect below would then file it under the
   * account that just signed in — which is the leak this is here to close.
   * Sign-in resolves after first paint, so this runs on a real visit.
   */
  const [loadedFor, setLoadedFor] = useState<string | null>(addressOwner);
  if (loadedFor !== addressOwner) {
    setLoadedFor(addressOwner);
    setShippingAddress(readSavedAddress(addressOwner));
  }

  // Persist the shipping address so the user never has to re-enter it once
  // accepted/edited — against their own account, never the browser at large.
  useEffect(() => {
    if (shippingAddress) writeSavedAddress(addressOwner, shippingAddress);
  }, [shippingAddress, addressOwner]);

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
            // Display only, and nothing reads `type`: the label a shopper sees
            // is the string the server stored on the order ('PayPal').
            paymentMethod: { id: 'restored', type: 'paypal', brand: (row.paymentMethod as string) ?? 'PayPal' },
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

  const createOrder = useCallback(async (order: Order): Promise<OrderResult> => {
    // The server is the authority on whether an order exists. It prices the
    // basket from the catalogue, checks stock, writes the row and sends the
    // confirmation — so until it answers 201 there is no order, nothing is
    // recorded locally, and a refusal is rethrown for checkout to show.
    //
    // This was once fire-and-forget into an empty catch. A basket the server
    // rejected still rendered "Order placed", under an order number minted in
    // the tab, promising a confirmation email that was never attempted. The
    // shopper believed they had bought something and nothing existed.
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
      const detail = await res.json().catch(() => ({} as { error?: string }));
      throw new Error(detail.error || 'Order could not be placed');
    }

    const data = await res.json().catch(() => ({} as OrderResponse));

    // Adopt the id the server actually stored. The browser-minted one was a
    // placeholder; quoted to support it matches no row in the database.
    const confirmed: Order = { ...order, id: data?.order?.id ?? order.id };

    const sentTo: string[] = [];
    if (data?.confirmationEmail?.sent && data?.order?.contactEmail) sentTo.push(data.order.contactEmail);
    if (data?.confirmationEmail?.copySent && data?.order?.copyEmail) sentTo.push(data.order.copyEmail);

    setOrders(prev => [...prev, confirmed]);
    setAppliedCoupon(null);
    return {
      order: confirmed,
      confirmationEmailSent: Boolean(data?.confirmationEmail?.sent),
      confirmationSentTo: sentTo,
    };
  }, [appliedCoupon]);

  const recordServerOrder = useCallback((order: Order) => {
    setOrders(prev => [...prev, order]);
    setAppliedCoupon(null);
  }, []);

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
      recordServerOrder,
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
