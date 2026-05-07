import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { supabase } from '../lib/supabase';
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
    const local = loadLocalCart();
    if (local.length > 0) {
      const inserts: Record<string, unknown>[] = local.map(item => ({
        user_id: userId,
        product_id: item.id,
        quantity: item.quantity,
        selected_color: item.selectedColor ?? null,
        selected_storage: item.selectedStorage ?? null,
        selected_condition: item.selectedCondition ?? null,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('cart_items') as any)
        .upsert(inserts, { onConflict: 'user_id,product_id,selected_color,selected_storage,selected_condition' });
    }

    // Fetch full cart with product data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('cart_items') as any)
      .select('*, products(*)')
      .eq('user_id', userId);

    if (error || !data) return;

    const merged: CartItem[] = (data as Record<string, unknown>[])
      .filter((row: Record<string, unknown>) => row.products)
      .map((row: Record<string, unknown>) => {
        const p = row.products as Record<string, unknown>;
        return {
          id: p.id as string,
          model: p.model as string,
          brand: p.brand as string,
          category: p.category as CartItem['category'],
          storage: (p.storage as string) ?? undefined,
          price: p.price as number,
          originalPrice: p.original_price as number,
          grade: p.grade as CartItem['grade'],
          batteryHealth: p.battery_health as number,
          warrantyMonths: p.warranty_months as number,
          returnDays: p.return_days as number,
          imageUrl: (p.image_url as string) ?? '',
          isCertified: p.is_certified as boolean,
          stock: p.stock as number,
          specs: (p.specs as CartItem['specs']) ?? {},
          quantity: row.quantity as number,
          selectedColor: (row.selected_color as string) ?? undefined,
          selectedStorage: (row.selected_storage as string) ?? undefined,
          selectedCondition: (row.selected_condition as string) ?? undefined,
        };
      });

    setItems(merged);
    saveLocalCart(merged);
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

  // ── Supabase upsert helper ─────────────────────────────────
  const upsertSupabaseItem = useCallback(async (item: CartItem) => {
    if (!session || !user || user.isGuest) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('cart_items') as any).upsert({
      user_id: user.id,
      product_id: item.id,
      quantity: item.quantity,
      selected_color: item.selectedColor ?? null,
      selected_storage: item.selectedStorage ?? null,
      selected_condition: item.selectedCondition ?? null,
    }, { onConflict: 'user_id,product_id,selected_color,selected_storage,selected_condition' });
  }, [session, user]);

  const deleteSupabaseItem = useCallback(async (productId: string) => {
    if (!session || !user || user.isGuest) return;
    await supabase.from('cart_items').delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);
  }, [session, user]);

  // ── Public API ─────────────────────────────────────────────
  const addToCart = (
    product: Product,
    quantity = 1,
    opts: { color?: string; storage?: string; condition?: string } = {}
  ) => {
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
      await supabase.from('cart_items').delete().eq('user_id', user.id);
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
