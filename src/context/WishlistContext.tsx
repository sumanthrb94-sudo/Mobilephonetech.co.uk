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
  // Saved ids not yet resolved to products. null until storage has been
  // read, which is what stops the first render overwriting it.
  const pending = useRef<string[] | null>(null);

  // Resolve saved ids against the catalogue, every time the catalogue changes.
  //
  // This never happened for a guest. Ids were written to localStorage on
  // every change but only ever read at sign-in, so a shopper who hearted a
  // few phones and opened the wishlist page found "Nothing saved yet" — and
  // worse, the persist effect below ran on the empty first render and wiped
  // the stored ids before anything could read them, so the hearts were gone
  // for good, sign-in merge included.
  //
  // Every change, not once: the catalogue arrives in two waves — the bundled
  // fallback first, then the live one — and an id the first wave cannot
  // resolve must still be waiting when the second arrives. Until then it is
  // kept in `pending` and written back to storage untouched.
  useEffect(() => {
    if (pending.current === null) pending.current = loadLocal();
    if (pending.current.length === 0 || catalogue.length === 0) return;

    const byId = new Map(catalogue.map(p => [p.id, p]));
    const found = pending.current.map(id => byId.get(id)).filter(Boolean) as Product[];
    if (found.length === 0) return;

    pending.current = pending.current.filter(id => !byId.has(id));
    setItems(prev => {
      const have = new Set(prev.map(i => i.id));
      return [...prev, ...found.filter(f => !have.has(f.id))];
    });
  }, [catalogue]);

  // Persist IDs to localStorage — what is shown plus what is still waiting
  // to be resolved, and never before storage has been read.
  useEffect(() => {
    if (pending.current === null) return;
    localStorage.setItem(WISHLIST_KEY, JSON.stringify([...items.map(i => i.id), ...pending.current]));
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
    pending.current = [];
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
