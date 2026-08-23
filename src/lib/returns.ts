import {
  collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, COL } from './firebase';
import type {
  ReturnRequest, ReturnReason, ReturnOutcome, ReturnStatus, ReturnLegalBasis, ReturnItem,
} from '../types';

/** Change-of-mind window under the Consumer Contracts Regulations 2013. */
export const COOLING_OFF_DAYS = 14;
/** Short-term right to reject faulty goods under the Consumer Rights Act 2015. */
export const SHORT_TERM_REJECT_DAYS = 30;
/** Warranty length advertised across the storefront. */
export const WARRANTY_MONTHS = 12;

export const MAX_RETURN_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export const RETURN_REASONS: { value: ReturnReason; label: string; faulty: boolean }[] = [
  { value: 'changed_mind',     label: 'Changed my mind',        faulty: false },
  { value: 'not_as_described', label: 'Not as described',       faulty: true  },
  { value: 'faulty',           label: 'Faulty or not working',  faulty: true  },
  { value: 'arrived_damaged',  label: 'Arrived damaged',        faulty: true  },
  { value: 'wrong_item',       label: 'Wrong item received',    faulty: true  },
  { value: 'arrived_late',     label: 'Arrived too late',       faulty: false },
  { value: 'other',            label: 'Something else',         faulty: false },
];

export const RETURN_OUTCOMES: { value: ReturnOutcome; label: string; blurb: string }[] = [
  { value: 'refund',      label: 'Refund',      blurb: 'Money back to your original payment method.' },
  { value: 'replacement', label: 'Replacement', blurb: 'The same model again, subject to stock.' },
  { value: 'repair',      label: 'Repair',      blurb: 'We fix it and send it back to you.' },
];

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: 'Requested',
  approved: 'Approved — send it back',
  rejected: 'Declined',
  received: 'Received — being inspected',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

/** Statuses a return can move to from where it is now. Staff-facing. */
export const NEXT_STATUSES: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ['approved', 'rejected'],
  approved: ['received', 'rejected'],
  received: ['resolved', 'rejected'],
  rejected: [],
  resolved: [],
  cancelled: [],
};

export const isOpenStatus = (s: ReturnStatus): boolean =>
  s === 'requested' || s === 'approved' || s === 'received';

/**
 * Which consumer right this request sits under.
 *
 * Kept explicit rather than derived at read time because the two rights have
 * different clocks and different obligations — staff handling the parcel must
 * not have to work out which case they are in from the reason text.
 */
export function legalBasisFor(reason: ReturnReason, orderDate: string | Date): ReturnLegalBasis {
  const faulty = RETURN_REASONS.find(r => r.value === reason)?.faulty ?? false;
  if (!faulty) return 'cooling_off';
  return daysSince(orderDate) <= SHORT_TERM_REJECT_DAYS ? 'faulty_goods' : 'warranty';
}

export function daysSince(date: string | Date): number {
  const then = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(then.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - then.getTime()) / 86_400_000);
}

export const withinCoolingOff = (orderDate: string | Date): boolean =>
  daysSince(orderDate) <= COOLING_OFF_DAYS;

/** True while any return route remains open to the customer. */
export const isReturnable = (orderDate: string | Date): boolean =>
  daysSince(orderDate) <= WARRANTY_MONTHS * 30;

/**
 * Human-readable RMA reference.
 *
 * Deliberately excludes I, O, 0 and 1 — customers read these over the phone
 * and write them on parcels, where those characters are routinely confused.
 */
export function generateRmaId(rand: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(rand() * alphabet.length)];
  return `RMA-${out}`;
}

export interface CreateReturnInput {
  orderId: string;
  orderDate: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  items: ReturnItem[];
  reason: ReturnReason;
  outcome: ReturnOutcome;
  note?: string;
  photoUrls?: string[];
}

export function buildReturn(input: CreateReturnInput, now = new Date()): ReturnRequest {
  const at = now.toISOString();
  return {
    id: generateRmaId(),
    orderId: input.orderId,
    userId: input.userId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    items: input.items,
    reason: input.reason,
    outcome: input.outcome,
    legalBasis: legalBasisFor(input.reason, input.orderDate),
    note: input.note?.trim() || '',
    photoUrls: input.photoUrls ?? [],
    status: 'requested',
    history: [{ status: 'requested', at, by: 'customer' }],
    refundAmount: input.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    replacementOrderId: null,
    staffNote: null,
    createdAt: at,
    updatedAt: at,
  };
}

export async function createReturn(input: CreateReturnInput): Promise<ReturnRequest> {
  const record = buildReturn(input);
  await setDoc(doc(db, COL.returns, record.id), record);
  // Deliberately not awaited: the return is saved either way, and a mail
  // outage must never surface to the customer as a failed request.
  void notifyReturn(record.id, 'received');
  return record;
}

/**
 * Ask the server to email the customer about a return.
 *
 * Never throws. The route reads the recipient from the stored document, so
 * this call cannot be used to send mail anywhere else; all it carries is
 * which return and which message.
 */
export async function notifyReturn(
  rmaId: string,
  kind: 'received' | 'approved' | 'rejected' | 'resolved',
): Promise<void> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch('/api/return-notify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ rmaId, kind }),
    });
  } catch {
    /* email is a courtesy, not part of the transaction */
  }
}

export async function uploadReturnPhoto(userId: string, file: File): Promise<string> {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    throw new Error('Photos must be JPEG, PNG, WebP or AVIF.');
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error('Each photo must be under 5MB.');
  }
  // A dot check, not split().pop(): "noext".split(".").pop() returns "noext",
  // so the usual fallback never fires and the extension becomes the filename.
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'jpg';
  const path = `return-photos/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const objectRef = ref(storage, path);
  await uploadBytes(objectRef, file, { contentType: file.type });
  return getDownloadURL(objectRef);
}

export async function listMyReturns(userId: string): Promise<ReturnRequest[]> {
  const snap = await getDocs(query(
    collection(db, COL.returns),
    where('userId', '==', userId),
    limit(50),
  ));
  // Sorted client-side: ordering by createdAt alongside the userId filter would
  // need a composite index, and fifty rows is nothing to sort here.
  return snap.docs
    .map(d => d.data() as ReturnRequest)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getReturn(rmaId: string): Promise<ReturnRequest | null> {
  const snap = await getDoc(doc(db, COL.returns, rmaId));
  return snap.exists() ? (snap.data() as ReturnRequest) : null;
}

/** Staff view. Optional status filter, newest first. */
export async function listReturns(status?: ReturnStatus | 'open'): Promise<ReturnRequest[]> {
  const snap = await getDocs(query(collection(db, COL.returns), orderBy('createdAt', 'desc'), limit(200)));
  const all = snap.docs.map(d => d.data() as ReturnRequest);
  if (!status) return all;
  if (status === 'open') return all.filter(r => isOpenStatus(r.status));
  return all.filter(r => r.status === status);
}

export async function advanceReturn(
  rma: ReturnRequest,
  next: ReturnStatus,
  opts: { note?: string; replacementOrderId?: string } = {},
): Promise<void> {
  if (!NEXT_STATUSES[rma.status].includes(next)) {
    throw new Error(`A ${RETURN_STATUS_LABEL[rma.status].toLowerCase()} return cannot move to ${next}.`);
  }
  const at = new Date().toISOString();
  await updateDoc(doc(db, COL.returns, rma.id), {
    status: next,
    updatedAt: at,
    staffNote: opts.note ?? rma.staffNote ?? null,
    ...(opts.replacementOrderId ? { replacementOrderId: opts.replacementOrderId } : {}),
    history: [...rma.history, { status: next, at, by: 'admin', ...(opts.note ? { note: opts.note } : {}) }],
  });

  // Approved / rejected / resolved are the transitions a customer needs told
  // about; "received" is internal bookkeeping they already expect.
  if (next === 'approved' || next === 'rejected' || next === 'resolved') {
    void notifyReturn(rma.id, next);
  }
}

export async function cancelReturn(rma: ReturnRequest): Promise<void> {
  const at = new Date().toISOString();
  await updateDoc(doc(db, COL.returns, rma.id), {
    status: 'cancelled',
    updatedAt: at,
    history: [...rma.history, { status: 'cancelled', at, by: 'customer' }],
  });
}
