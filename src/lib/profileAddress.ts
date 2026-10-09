import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db, COL } from './firebase';
import { fromStoredAddress, toProfileAddress, type AddressDraft } from '../utils/address';

/**
 * The signed-in customer's saved delivery address, read and written in one
 * place so checkout and My Account cannot drift apart again.
 *
 * It lives on the profile document, `users/{uid}.address`, which only its
 * owner (and staff) can read; firestore.rules checks its shape on write.
 */

export interface SavedAddress {
  address: AddressDraft;
  /**
   * 'order' when nothing is on the profile yet and this came from the most
   * recent order instead — every customer who checked out before checkout
   * saved to the profile. Shown as such, and saved properly the first time
   * they confirm it.
   */
  source: 'profile' | 'order';
  /** The profile's own contact number, for pre-filling checkout's phone box. */
  phone: string;
}

export async function loadSavedAddress(uid: string): Promise<SavedAddress | null> {
  let phone = '';
  try {
    const snap = await getDoc(doc(db, COL.users, uid));
    const data = snap.data() as Record<string, unknown> | undefined;
    phone = String(data?.phone || data?.contactPhone || '').trim();
    const fromProfile = fromStoredAddress(data?.address);
    if (fromProfile) return { address: fromProfile, source: 'profile', phone };
  } catch { /* fall through to the order history */ }

  try {
    // No orderBy: equality plus orderBy on another field needs a composite
    // index. A customer has few orders; the newest is found in memory.
    const snap = await getDocs(query(collection(db, COL.orders), where('userId', '==', uid)));
    const newest = snap.docs
      .map(d => d.data() as Record<string, unknown>)
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
      .map(o => fromStoredAddress(o.shippingAddress))
      .find(Boolean);
    if (newest) return { address: newest, source: 'order', phone };
  } catch { /* nothing to offer */ }

  return null;
}

/**
 * Save the address to the profile. merge:true, so name, phone and role are
 * untouched — and role could not be changed from here anyway (see rules).
 * Throws on failure; callers decide whether that is worth telling someone.
 */
export async function saveProfileAddress(uid: string, address: Partial<AddressDraft>): Promise<void> {
  await setDoc(
    doc(db, COL.users, uid),
    { address: toProfileAddress(address), updatedAt: serverTimestamp() },
    { merge: true },
  );
}
