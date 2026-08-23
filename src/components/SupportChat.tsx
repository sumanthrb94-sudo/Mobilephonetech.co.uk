import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ensureConversation, sendMessage, watchMessages, watchConversation, markRead,
  relativeTime, MAX_MESSAGE_LENGTH,
} from '../lib/support';
import type { SupportMessage } from '../types';

/**
 * Customer support chat.
 *
 * Signed-in only, and deliberately so: an anonymous thread cannot be tied to
 * an order, cannot be picked up again on another device, and gives staff no
 * way to answer once the tab closes. Guests get a prompt to sign in rather
 * than a dead end.
 *
 * Messages arrive over a Firestore snapshot listener, so a reply from the
 * back office lands without the customer refreshing.
 */
export default function SupportChat() {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const signedIn = isAuthenticated && user && !user.isGuest;

  // Thread metadata drives the unread badge even while the panel is shut.
  useEffect(() => {
    if (!signedIn || !user) { setUnread(0); return; }
    return watchConversation(user.id, c => setUnread(c?.unreadForCustomer ?? 0), () => setUnread(0));
  }, [signedIn, user]);

  // Messages are only streamed while the panel is open — no point holding a
  // listener open for a widget nobody has touched.
  useEffect(() => {
    if (!open || !signedIn || !user) return;
    let cancelled = false;
    (async () => {
      try {
        await ensureConversation(user.id, user.fullName || 'Customer', user.email ?? '');
        if (cancelled) return;
        await markRead(user.id, 'customer');
      } catch {
        if (!cancelled) setError('Could not open the chat. Please try again.');
      }
    })();
    const stop = watchMessages(user.id, setMessages, () => setError('Lost connection to chat.'));
    return () => { cancelled = true; stop(); };
  }, [open, signedIn, user]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, open]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !user || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(user.id, body, 'customer', user.fullName || 'Customer');
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message not sent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={unread > 0 ? `Open support chat, ${unread} unread` : 'Open support chat'}
          className="support-fab"
        >
          <MessageCircle size={22} />
          {unread > 0 && <span className="support-fab-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
        </button>
      )}

      {open && (
        <section className="support-panel" role="dialog" aria-label="Support chat">
          <header className="support-head">
            <div>
              <strong style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5 }}>LeHart support</strong>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                We reply within a few hours
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close support chat" className="support-close">
              <X size={18} />
            </button>
          </header>

          {!signedIn ? (
            <div className="support-body" style={{ display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--grey-60)', lineHeight: 1.6 }}>
                Sign in to chat with us — that way we can see your orders and pick the
                conversation back up whenever you return.
              </p>
            </div>
          ) : (
            <>
              <div className="support-body">
                {messages.length === 0 && (
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--grey-50)', textAlign: 'center', margin: '20px 0' }}>
                    Ask us anything — orders, returns, grading, trade-ins.
                  </p>
                )}
                {messages.map(m => (
                  <div key={m.id} className={m.sender === 'customer' ? 'support-msg support-msg-me' : 'support-msg support-msg-them'}>
                    <span className="support-msg-body">{m.body}</span>
                    <span className="support-msg-meta">
                      {m.sender === 'admin' ? `${m.senderName} · ` : ''}{relativeTime(m.at)}
                    </span>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              {error && (
                <p role="alert" style={{ margin: 0, padding: '6px 12px', fontSize: 12.5, color: '#991b1b', background: 'var(--color-sale-subtle)' }}>
                  {error}
                </p>
              )}

              <form onSubmit={send} className="support-compose">
                <label htmlFor="support-input" className="sr-only">Your message</label>
                <input
                  id="support-input"
                  name="supportMessage"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder="Type a message…"
                  autoComplete="off"
                />
                <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message">
                  {sending ? <Loader2 size={16} className="admin-spin" /> : <Send size={16} />}
                </button>
              </form>
            </>
          )}
        </section>
      )}
    </>
  );
}
