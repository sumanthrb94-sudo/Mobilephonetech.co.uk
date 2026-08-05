import {
  collection, deleteDoc, doc, getDocs, setDoc, writeBatch,
} from 'firebase/firestore';
import { db, COL } from './firebase';
import { stripUndefined } from './productMapper';

/**
 * Per-user cart and wishlist, stored as subcollections of users/{uid}.
 *
 * The Postgres version joined cart_items back to products on every read. Here
 * the whole item is denormalised into the document instead: Firestore charges
 * per document read, so a join would cost one extra read per line, and the
 * cart already has to survive as a local snapshot for signed-out shoppers —
 * so the shape was needed anyway.
 */

/**
 * Stable document id for a cart line.
 *
 * Postgres enforced uniqueness over
 * (user, product, colour, storage, condition) with a constraint. Firestore has
 * no unique constraints, so the same tuple is encoded into the document id and
 * uniqueness falls out of the key space. Values are sanitised because "/" is
 * a path separator in a document id and would silently create a subcollection.
 */
export function cartItemKey(
  productId: string,
  opts: { color?: string; storage?: string; condition?: string } = {},
): string {
  const part = (v?: string) => (v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-') || '_';
  return [productId, part(opts.color), part(opts.storage), part(opts.condition)].join('__');
}

function cartCol(uid: string) {
  return collection(db, COL.users, uid, COL.cart);
}

function wishlistCol(uid: string) {
  return collection(db, COL.users, uid, COL.wishlist);
}

export async function readCart(uid: string): Promise<Record<string, unknown>[]> {
  const snap = await getDocs(cartCol(uid));
  return snap.docs.map(d => d.data());
}

export async function writeCartItem(uid: string, item: Record<string, unknown>): Promise<void> {
  const key = cartItemKey(item.id as string, {
    color: item.selectedColor as string | undefined,
    storage: item.selectedStorage as string | undefined,
    condition: item.selectedCondition as string | undefined,
  });
  await setDoc(doc(cartCol(uid), key), stripUndefined(item), { merge: true });
}

/** Push a whole local cart up at sign-in, in one batch rather than N writes. */
export async function mergeLocalCart(uid: string, items: Record<string, unknown>[]): Promise<void> {
  if (!items.length) return;
  const batch = writeBatch(db);
  for (const item of items) {
    const key = cartItemKey(item.id as string, {
      color: item.selectedColor as string | undefined,
      storage: item.selectedStorage as string | undefined,
      condition: item.selectedCondition as string | undefined,
    });
    batch.set(doc(cartCol(uid), key), stripUndefined(item), { merge: true });
  }
  await batch.commit();
}

/**
 * Remove every line for a product, whatever variant was chosen.
 * The public removeFromCart API takes only a product id, so all matching
 * variant documents have to go.
 */
export async function deleteCartProduct(uid: string, productId: string): Promise<void> {
  const snap = await getDocs(cartCol(uid));
  const batch = writeBatch(db);
  let n = 0;
  for (const d of snap.docs) {
    if (d.id === productId || d.id.startsWith(`${productId}__`)) { batch.delete(d.ref); n++; }
  }
  if (n) await batch.commit();
}

export async function clearCartRemote(uid: string): Promise<void> {
  const snap = await getDocs(cartCol(uid));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

// ── Wishlist ───────────────────────────────────────────────────
// Keyed by product id, so adding twice is idempotent without a constraint.

export async function readWishlist(uid: string): Promise<string[]> {
  const snap = await getDocs(wishlistCol(uid));
  return snap.docs.map(d => d.id);
}

export async function addWishlistItem(uid: string, productId: string): Promise<void> {
  await setDoc(doc(wishlistCol(uid), productId), { productId, addedAt: Date.now() });
}

export async function removeWishlistItem(uid: string, productId: string): Promise<void> {
  await deleteDoc(doc(wishlistCol(uid), productId));
}

export async function mergeLocalWishlist(uid: string, productIds: string[]): Promise<void> {
  if (!productIds.length) return;
  const batch = writeBatch(db);
  for (const id of productIds) {
    batch.set(doc(wishlistCol(uid), id), { productId: id, addedAt: Date.now() });
  }
  await batch.commit();
}

export async function clearWishlistRemote(uid: string): Promise<void> {
  const snap = await getDocs(wishlistCol(uid));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}
