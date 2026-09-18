import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../types';
import { readWishlist, addWishlistItem, removeWishlistItem, mergeLocalWishlist, clearWishlistRemote } from '../lib/userData';
import { useCatalogue } from './CatalogueContext';
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
  const { products: catalogue } = useCatalogue();
  // Store full product objects locally; only ids are persisted remotely.
  const [items, setItems] = useState<Product[]>([]);
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
  const hydrated = useRef(false);

  // Read the saved ids back once the catalogue can resolve them.
  //
  // This never happened for a guest. Ids were written to localStorage on
  // every change but only ever read at sign-in, so a shopper who hearted a
  // few phones and opened the wishlist page found "Nothing saved yet" — and
  // worse, the persist effect below ran on the empty first render and wiped
  // the stored ids before anything could read them, so the hearts were gone
  // for good, sign-in merge included.
  useEffect(() => {
    if (hydrated.current || catalogue.length === 0) return;
    const byId = new Map(catalogue.map(p => [p.id, p]));
    const saved = loadLocal().map(id => byId.get(id)).filter(Boolean) as Product[];
    hydrated.current = true;
    if (saved.length) setItems(prev => (prev.length ? prev : saved));
  }, [catalogue]);

  // Persist IDs to localStorage — but not before hydration, or the empty
  // first render overwrites what was saved.
  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items.map(i => i.id)));
  }, [items]);

  // On login: push local IDs, then read the merged set back.
  //
  // Firestore stores only the product ids — the Postgres version joined back to
  // products, but the catalogue is already loaded in memory here (this provider
  // sits inside CatalogueProvider), so resolving from it costs nothing instead
  // of one document read per wishlisted item.
  const syncFromSupabase = useCallback(async (userId: string) => {
    try {
      const localIds = loadLocal();
      if (localIds.length > 0) await mergeLocalWishlist(userId, localIds);

      const ids = await readWishlist(userId);
      const byId = new Map(catalogue.map(p => [p.id, p]));
      const synced = ids.map(id => byId.get(id)).filter(Boolean) as Product[];

      setItems(synced);
    } catch {
      // Keep whatever is in local state rather than clearing the wishlist on a
      // transient failure.
    }
  }, [catalogue]);

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
      void addWishlistItem(user.id, product.id).catch(() => { /* local state stands */ });
    }
  };

  const removeFromWishlist = (productId: string) => {
    setItems(prev => prev.filter(i => i.id !== productId));
    if (session && user && !user.isGuest) {
      void removeWishlistItem(user.id, productId).catch(() => { /* local state stands */ });
    }
  };

  const isInWishlist = (id: string) => items.some(i => i.id === id);

  const clearWishlist = async () => {
    setItems([]);
    if (session && user && !user.isGuest) {
      try { await clearWishlistRemote(user.id); } catch { /* local already cleared */ }
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
