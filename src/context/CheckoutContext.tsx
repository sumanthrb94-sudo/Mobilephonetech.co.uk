import React, { createContext, useContext, useState } from 'react';

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
  type: 'card' | 'paypal' | 'apple_pay';
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
  items: any[];
  shippingAddress: ShippingAddress;
  shippingOption: ShippingOption;
  paymentMethod: PaymentMethod;
  subtotal: number;
  shippingCost: number;
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
  createOrder: (order: Order) => void;
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
  const [currentStep, setCurrentStep] = useState<'cart' | 'shipping' | 'payment' | 'review' | 'confirmation'>('cart');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [shippingOption, setShippingOption] = useState<ShippingOption | null>(SHIPPING_OPTIONS[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

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

  const createOrder = (order: Order) => {
    setOrders((prev) => [...prev, order]);
    setAppliedCoupon(null); // Reset coupon after order
  };

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
