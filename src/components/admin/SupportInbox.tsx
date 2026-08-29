import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Inbox, CheckCheck, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  watchAllConversations, watchMessages, sendMessage, markRead,
  setConversationStatus, relativeTime, MAX_MESSAGE_LENGTH,
} from '../../lib/support';
import type { SupportConversation, SupportMessage } from '../../types';

/**
 * Staff support inbox — thread list beside the open conversation.
 *
 * Both panes are live snapshot listeners, so a message arriving while staff
 * are reading lands in place. The thread list is ordered by most recent
 * activity, which is the order a small team actually works it.
 */
export default function SupportInbox() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<SupportConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => watchAllConversations(setThreads, () => setError('Could not load conversations.')), []);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    markRead(activeId, 'admin').catch(() => {});
    return watchMessages(activeId, setMessages, () => setError('Could not load messages.'));
  }, [activeId]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages]);

  const active = threads.find(t => t.id === activeId) ?? null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage(activeId, body, 'admin', user?.fullName || 'LeHart support');
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message not sent.');
    } finally {
      setSending(false);
    }
  };

  const waiting = threads.filter(t => t.unreadForAdmin > 0).length;

  return (
    <div className="ops-stack">
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">LeHart back office</p>
          <h1 className="ops-title">Support</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--grey-50)', margin: '4px 0 0' }}>
            {threads.length} conversation{threads.length === 1 ? '' : 's'}
            {waiting > 0 ? ` · ${waiting} waiting on a reply` : ''}
          </p>
        </div>
      </header>

      {error && (
        <div role="alert" style={{
          background: 'var(--color-sale-subtle)', border: '1px solid #fecaca', color: '#991b1b',
          borderRadius: 'var(--radius-md)', padding: '10px 12px',
          fontFamily: 'var(--font-body)', fontSize: 13.5,
        }}>{error}</div>
      )}

      <div className="support-admin">
        {/* Thread list */}
        <aside className="support-threads" aria-label="Conversations">
          {threads.length === 0 ? (
            <div style={{ display: 'grid', placeItems: 'center', gap: 10, padding: 32, textAlign: 'center' }}>
              <Inbox size={26} style={{ color: 'var(--grey-30)' }} />
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--grey-50)' }}>
                No conversations yet.
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {threads.map(t => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    aria-current={activeId === t.id}
                    className={`support-thread${activeId === t.id ? ' is-active' : ''}`}
                  >
                    <span className="support-thread-top">
                      <strong>{t.customerName}</strong>
                      {t.unreadForAdmin > 0 && <span className="support-thread-badge">{t.unreadForAdmin}</span>}
                    </span>
                    <span className="support-thread-preview">
                      {t.lastSender === 'admin' ? 'You: ' : ''}{t.lastMessage || 'No messages yet'}
                    </span>
                    <span className="support-thread-time">
                      {relativeTime(t.lastMessageAt)}{t.status === 'closed' ? ' · closed' : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Conversation */}
        <section className="support-convo" aria-label="Conversation">
          {!active ? (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', padding: 32, textAlign: 'center' }}>
              <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--grey-50)' }}>
                Pick a conversation to read and reply.
              </p>
            </div>
          ) : (
            <>
              <header className="support-convo-head">
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontFamily: 'var(--font-sans)', fontSize: 15 }}>{active.customerName}</strong>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--grey-50)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {active.customerEmail}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setConversationStatus(active.id, active.status === 'open' ? 'closed' : 'open').catch(() => {})}
                >
                  {active.status === 'open' ? <><CheckCheck size={13} /> Close</> : <><RotateCcw size={13} /> Reopen</>}
                </button>
              </header>

              <div className="support-body">
                {messages.map(m => (
                  <div key={m.id} className={m.sender === 'admin' ? 'support-msg support-msg-me' : 'support-msg support-msg-them'}>
                    <span className="support-msg-body">{m.body}</span>
                    <span className="support-msg-meta">
                      {m.sender === 'admin' ? `${m.senderName} · ` : ''}{relativeTime(m.at)}
                    </span>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <form onSubmit={send} className="support-compose">
                <label htmlFor="admin-reply" className="sr-only">Reply to {active.customerName}</label>
                <input
                  id="admin-reply"
                  name="adminReply"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder={`Reply to ${active.customerName}…`}
                  autoComplete="off"
                />
                <button type="submit" disabled={!draft.trim() || sending} aria-label="Send reply">
                  {sending ? <Loader2 size={16} className="admin-spin" /> : <Send size={16} />}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
