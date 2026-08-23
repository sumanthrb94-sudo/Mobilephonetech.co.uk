import {
  addDoc, collection, doc, getDoc, increment, limit, onSnapshot,
  orderBy, query, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore';
import { db, COL } from './firebase';
import type { SupportConversation, SupportMessage, MessageSender } from '../types';

export const MAX_MESSAGE_LENGTH = 2000;

/**
 * One thread per customer, keyed by their uid.
 *
 * A small shop wants the person's history, not a pile of disconnected
 * tickets — and keying by uid makes the security rule trivially correct: a
 * customer can only ever address the document whose id is their own id.
 */
export const conversationRef = (userId: string) => doc(db, COL.conversations, userId);
export const messagesRef = (userId: string) =>
  collection(db, COL.conversations, userId, COL.messages);

export async function ensureConversation(
  userId: string,
  customerName: string,
  customerEmail: string,
): Promise<void> {
  const existing = await getDoc(conversationRef(userId));
  if (existing.exists()) return;

  const now = new Date().toISOString();
  const conversation: SupportConversation = {
    id: userId,
    userId,
    customerName,
    customerEmail,
    lastMessage: '',
    lastMessageAt: now,
    lastSender: 'customer',
    unreadForAdmin: 0,
    unreadForCustomer: 0,
    status: 'open',
    createdAt: now,
  };
  await setDoc(conversationRef(userId), conversation);
}

export async function sendMessage(
  userId: string,
  body: string,
  sender: MessageSender,
  senderName: string,
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Message cannot be empty.');
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`);
  }

  const at = new Date().toISOString();
  await addDoc(messagesRef(userId), { body: trimmed, sender, senderName, at });

  // The unread counter increments for whoever did NOT send. Using increment()
  // rather than read-then-write keeps the count correct when both sides are
  // typing at once — the case a support inbox actually hits.
  await updateDoc(conversationRef(userId), {
    lastMessage: trimmed.slice(0, 140),
    lastMessageAt: at,
    lastSender: sender,
    status: 'open',
    ...(sender === 'customer'
      ? { unreadForAdmin: increment(1) }
      : { unreadForCustomer: increment(1) }),
    touchedAt: serverTimestamp(),
  });
}

/** Live message feed for one thread. Returns an unsubscribe function. */
export function watchMessages(
  userId: string,
  onChange: (messages: SupportMessage[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    query(messagesRef(userId), orderBy('at', 'asc'), limit(200)),
    snap => onChange(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<SupportMessage, 'id'>) }))),
    err => onError?.(err as Error),
  );
}

/** Live thread metadata — used for the unread badge on the customer widget. */
export function watchConversation(
  userId: string,
  onChange: (conversation: SupportConversation | null) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    conversationRef(userId),
    snap => onChange(snap.exists() ? (snap.data() as SupportConversation) : null),
    err => onError?.(err as Error),
  );
}

/** Live inbox for staff, busiest thread first. */
export function watchAllConversations(
  onChange: (conversations: SupportConversation[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(db, COL.conversations), orderBy('lastMessageAt', 'desc'), limit(100)),
    snap => onChange(snap.docs.map(d => d.data() as SupportConversation)),
    err => onError?.(err as Error),
  );
}

export async function markRead(userId: string, reader: MessageSender): Promise<void> {
  await updateDoc(conversationRef(userId), {
    ...(reader === 'admin' ? { unreadForAdmin: 0 } : { unreadForCustomer: 0 }),
  });
}

export async function setConversationStatus(userId: string, status: 'open' | 'closed'): Promise<void> {
  await updateDoc(conversationRef(userId), { status });
}

/** "2 min ago" — support threads are read in relative time, not timestamps. */
export function relativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.floor((now - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
