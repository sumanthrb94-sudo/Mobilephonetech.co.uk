import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  items: Product[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_KEY = 'mpm_wishlist';

function loadLocal(): string[] {
  try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? '[]'); } catch { return []; }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  // Store full product objects locally; only IDs go to Supabase
  const [items, setItems] = useState<Product[]>([]);
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);

  // Persist IDs to localStorage
  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items.map(i => i.id)));
  }, [items]);

  // On login: push local IDs, fetch Supabase wishlist
  const syncFromSupabase = useCallback(async (userId: string) => {
    const localIds = loadLocal();

    if (localIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('wishlist_items') as any).upsert(
        localIds.map((id: string) => ({ user_id: userId, product_id: id })),
        { onConflict: 'user_id,product_id', ignoreDuplicates: true }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from('wishlist_items') as any)
      .select('product_id, products(*)')
      .eq('user_id', userId);

    if (!data) return;

    const synced: Product[] = (data as Record<string, unknown>[])
      .filter((row: Record<string, unknown>) => row.products)
      .map((row: Record<string, unknown>) => {
        const p = row.products as Record<string, unknown>;
        return {
          id: p.id as string,
          model: p.model as string,
          brand: p.brand as string,
          category: p.category as Product['category'],
          storage: (p.storage as string) ?? undefined,
          price: p.price as number,
          originalPrice: p.original_price as number,
          grade: p.grade as Product['grade'],
          batteryHealth: p.battery_health as number,
          warrantyMonths: p.warranty_months as number,
          returnDays: p.return_days as number,
          imageUrl: (p.image_url as string) ?? '',
          isCertified: p.is_certified as boolean,
          stock: p.stock as number,
          specs: (p.specs as Product['specs']) ?? {},
        };
      });

    setItems(synced);
  }, []);

  useEffect(() => {
    if (session && user && !user.isGuest && user.id !== syncedUserId) {
      setSyncedUserId(user.id);
      syncFromSupabase(user.id);
    }
    if (!session) setSyncedUserId(null);
  }, [session, user, syncedUserId, syncFromSupabase]);

  const addToWishlist = (product: Product) => {
    if (items.find(i => i.id === product.id)) return;
    setItems(prev => [...prev, product]);
    if (session && user && !user.isGuest) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('wishlist_items') as any)
        .upsert({ user_id: user.id, product_id: product.id }, { ignoreDuplicates: true });
    }
  };

  const removeFromWishlist = (productId: string) => {
    setItems(prev => prev.filter(i => i.id !== productId));
    if (session && user && !user.isGuest) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('wishlist_items') as any)
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
    }
  };

  const isInWishlist = (id: string) => items.some(i => i.id === id);

  const clearWishlist = async () => {
    setItems([]);
    if (session && user && !user.isGuest) {
      await supabase.from('wishlist_items').delete().eq('user_id', user.id);
    }
  };

  return (
    <WishlistContext.Provider value={{
      items,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      clearWishlist,
      wishlistCount: items.length,
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
