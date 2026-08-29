import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { trackAddToCart } from '../lib/analytics';
import { Product } from '../types';
import { mergeLocalCart, readCart, writeCartItem, deleteCartProduct, clearCartRemote } from '../lib/userData';
import { useAuth } from './AuthContext';

export interface CartItem extends Product {
  quantity: number;
  selectedColor?: string;
  selectedStorage?: string;
  selectedCondition?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, opts?: { color?: string; storage?: string; condition?: string }) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  lastAddedItem: CartItem | null;
  lastAddedQuantity: number;
  clearLastAdded: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = 'mpm_cart';

function loadLocalCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveLocalCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [items, setItems] = useState<CartItem[]>(loadLocalCart);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<CartItem | null>(null);
  const [lastAddedQuantity, setLastAddedQuantity] = useState(0);
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);

  // ── Persist to localStorage whenever items change ──────────
  useEffect(() => {
    saveLocalCart(items);
  }, [items]);

  // ── On login: merge local cart into Supabase, then load ───
  const syncFromSupabase = useCallback(async (userId: string) => {
    // Upsert any local items into Supabase first
    try {
      // Push anything added while signed out, then read the merged result back.
      const local = loadLocalCart();
      if (local.length > 0) {
        await mergeLocalCart(userId, local as unknown as Record<string, unknown>[]);
      }

      const rows = await readCart(userId);
      const merged = rows as unknown as CartItem[];

      setItems(merged);
      saveLocalCart(merged);
    } catch {
      // Offline or rules-denied: the local cart stays authoritative rather
      // than being blown away by an empty remote read.
    }
  }, []);

  useEffect(() => {
    if (session && user && !user.isGuest && user.id !== syncedUserId) {
      setSyncedUserId(user.id);
      syncFromSupabase(user.id);
    }
    if (!session) {
      setSyncedUserId(null);
    }
  }, [session, user, syncedUserId, syncFromSupabase]);

  // ── Remote write helpers ───────────────────────────────────
  // Fire-and-forget: a failed sync must not block the optimistic local update,
  // and the local cart is re-pushed on the next sign-in anyway.
  const upsertSupabaseItem = useCallback(async (item: CartItem) => {
    if (!session || !user || user.isGuest) return;
    try {
      await writeCartItem(user.id, item as unknown as Record<string, unknown>);
    } catch { /* keep the local cart */ }
  }, [session, user]);

  const deleteSupabaseItem = useCallback(async (productId: string) => {
    if (!session || !user || user.isGuest) return;
    try {
      await deleteCartProduct(user.id, productId);
    } catch { /* keep the local cart */ }
  }, [session, user]);

  // ── Public API ─────────────────────────────────────────────
  const addToCart = (
    product: Product,
    quantity = 1,
    opts: { color?: string; storage?: string; condition?: string } = {}
  ) => {
    // Outside setItems on purpose: React runs the updater twice in StrictMode,
    // which would double every count in development and make the numbers a
    // liar exactly where they are easiest to trust.
    trackAddToCart(product.id);

    setItems(prev => {
      const key = `${product.id}__${opts.color ?? ''}__${opts.storage ?? ''}__${opts.condition ?? ''}`;
      const existing = prev.find(i =>
        `${i.id}__${i.selectedColor ?? ''}__${i.selectedStorage ?? ''}__${i.selectedCondition ?? ''}` === key
      );
      if (existing) {
        const updated = prev.map(i =>
          `${i.id}__${i.selectedColor ?? ''}__${i.selectedStorage ?? ''}__${i.selectedCondition ?? ''}` === key
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
        const updatedItem = updated.find(i => i.id === product.id)!;
        upsertSupabaseItem(updatedItem);
        setLastAddedItem(updatedItem);
        return updated;
      }
      const newItem: CartItem = {
        ...product,
        quantity,
        selectedColor: opts.color,
        selectedStorage: opts.storage,
        selectedCondition: opts.condition,
      };
      upsertSupabaseItem(newItem);
      setLastAddedItem(newItem);
      return [...prev, newItem];
    });
    setLastAddedQuantity(quantity);
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(i => i.id !== productId));
    deleteSupabaseItem(productId);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(productId); return; }
    setItems(prev => {
      const updated = prev.map(i => i.id === productId ? { ...i, quantity } : i);
      const item = updated.find(i => i.id === productId);
      if (item) upsertSupabaseItem(item);
      return updated;
    });
  };

  const clearCart = async () => {
    setItems([]);
    if (session && user && !user.isGuest) {
      try { await clearCartRemote(user.id); } catch { /* local cart already cleared */ }
    }
  };

  const clearLastAdded = () => {
    setLastAddedItem(null);
    setLastAddedQuantity(0);
  };

  const cartTotal = items.reduce((t, i) => t + i.price * i.quantity, 0);
  const cartCount = items.reduce((c, i) => c + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items, addToCart, removeFromCart, updateQuantity, clearCart,
      cartTotal, cartCount, isCartOpen, setIsCartOpen,
      lastAddedItem, lastAddedQuantity, clearLastAdded,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
