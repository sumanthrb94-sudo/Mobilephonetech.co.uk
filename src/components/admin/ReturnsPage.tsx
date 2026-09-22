import { useCallback, useEffect, useState } from 'react';
import {
  RotateCcw, Loader2, AlertTriangle, Check, X, PackageCheck, Inbox, RefreshCw, Wrench, Banknote,
} from 'lucide-react';
import {
  listReturns, advanceReturn, NEXT_STATUSES, RETURN_STATUS_LABEL,
  RETURN_REASONS, isOpenStatus,
} from '../../lib/returns';
import { describeError } from '../../lib/adminApi';
import type { ReturnRequest, ReturnStatus, ReturnOutcome } from '../../types';

type Filter = 'open' | 'requested' | 'approved' | 'received' | 'resolved' | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'open',      label: 'Open' },
  { value: 'requested', label: 'New' },
  { value: 'approved',  label: 'Awaiting parcel' },
  { value: 'received',  label: 'To inspect' },
  { value: 'resolved',  label: 'Resolved' },
  { value: 'all',       label: 'All' },
];

const OUTCOME_ICON: Record<ReturnOutcome, React.ReactNode> = {
  refund: <Banknote size={13} />,
  replacement: <RefreshCw size={13} />,
  repair: <Wrench size={13} />,
};

/**
 * Where a return has actually got to, and whose move is next.
 *
 * A status word on its own does not say this. "Received" tells you a parcel
 * arrived; it does not tell you the parcel is now on the bench waiting for
 * somebody to open it, nor that opening it is two jobs and not one — log what
 * was wrong with the handset, then settle it by the route the customer was
 * promised. InventoryManager runs its returns as that explicit handoff and
 * names the step on screen, which is why nobody there has to ask whether a
 * return is waiting on them or on the post.
 *
 * Returns null for the three closed statuses. A closed return has no next
 * step, and inventing a polite one for it would put finished work back in
 * front of staff every morning.
 */
function handoff(r: ReturnRequest): { step: string; next: string } | null {
  const route = r.outcome === 'replacement' ? 'a replacement'
    : r.outcome === 'repair' ? 'a repair'
    : 'a refund';

  if (r.status === 'requested') {
    return {
      step: 'Step 1 of 3 · Decide',
      next: 'Approve it and send the customer a label, or decline with a reason they can act on.',
    };
  }
  if (r.status === 'approved') {
    return {
      step: 'Step 2 of 3 · With the customer',
      next: 'Waiting on the parcel. Mark it received the day it lands, not the day you open it.',
    };
  }
  if (r.status === 'received') {
    return {
      step: 'Step 3 of 3 · Inspect',
      next: r.staffNote
        ? `Findings are logged. Settle it as ${route}, then resolve.`
        : `Check the handset and write down what you found, then settle it as ${route}.`,
    };
  }
  return null;
}

/**
 * Returns queue.
 *
 * Ordered by what needs a decision rather than by date: a new request and a
 * parcel waiting to be inspected are jobs, a resolved return is a record.
 */
export default function ReturnsPage() {
  const [rows, setRows] = useState<ReturnRequest[]>([]);
  const [filter, setFilter] = useState<Filter>('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listReturns(filter === 'all' ? undefined : filter === 'open' ? 'open' : filter));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const move = async (rma: ReturnRequest, next: ReturnStatus) => {
    setBusyId(rma.id);
    setError(null);
    try {
      // Rejecting without saying why leaves the customer with nothing to act
      // on, and staff with nothing to point at later.
      let note: string | undefined;
      if (next === 'rejected') {
        const reason = window.prompt('Why is this return being declined? The customer will be told.');
        if (reason === null) { setBusyId(null); return; }
        if (!reason.trim()) { setError('A decline needs a reason.'); setBusyId(null); return; }
        note = reason.trim();
      }
      await advanceReturn(rma, next, { note });
      setNotice(`${rma.id} → ${RETURN_STATUS_LABEL[next]}`);
      await load();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusyId(null);
    }
  };

  const openCount = rows.filter(r => isOpenStatus(r.status)).length;
  // An empty list after a failed read is not an empty queue, and every count
  // and empty state below has to know the difference before it prints a zero.
  const unread = !loading && !!error && rows.length === 0;

  return (
    <div className="ops-stack">
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">LeHart back office</p>
          <h1 className="ops-title">Returns</h1>
          <p className="ops-question">
            Which of these is waiting on you, and which is waiting on the post?
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--grey-50)', margin: '4px 0 0' }}>
            {loading ? 'Loading…'
              : unread ? <span className="ops-awaiting">Awaiting — the queue could not be read</span>
              : `${rows.length} shown · ${openCount} needing action`}
          </p>
        </div>
        <button type="button" onClick={load} className="btn btn-secondary btn-md" aria-label="Refresh returns">
          <RefreshCw size={15} />
        </button>
      </header>

      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}
      {error && <Banner tone="error" onDismiss={() => setError(null)}>{error}</Banner>}

      <div className="admin-panel">
        <div className="admin-toolbar">
          {FILTERS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className="admin-ghost"
              style={{
                minHeight: 34, padding: '0 12px', borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${filter === f.value ? 'var(--black)' : 'var(--grey-20)'}`,
                background: filter === f.value ? 'var(--black)' : 'transparent',
                color: filter === f.value ? 'var(--grey-0)' : 'var(--grey-60)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={emptyStyle} aria-live="polite">Loading returns…</p>
        ) : unread ? (
          <div style={{ ...emptyStyle, display: 'grid', placeItems: 'center', gap: 12 }} role="status">
            <AlertTriangle size={30} style={{ color: 'var(--color-sale)' }} />
            <span className="ops-chip">Could not load</span>
            <p style={{ margin: 0 }}>
              The returns queue could not be read. Nothing is showing because nothing is known,
              not because nothing is waiting.
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ ...emptyStyle, display: 'grid', placeItems: 'center', gap: 12 }}>
            <Inbox size={30} style={{ color: 'var(--grey-30)' }} />
            <p style={{ margin: 0 }}>Nothing here. That is the good outcome.</p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {rows.map(r => {
              const reasonLabel = RETURN_REASONS.find(x => x.value === r.reason)?.label ?? r.reason;
              const open = expanded === r.id;
              const step = handoff(r);
              return (
                <li key={r.id} className="admin-row" style={{ display: 'block', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : r.id)}
                        aria-expanded={open}
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
                          fontFamily: 'var(--font-sans)', fontSize: 14.5, fontWeight: 700, color: 'var(--black)',
                          minHeight: 24, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                        }}
                      >
                        {r.id}
                        <span style={outcomeChip}>
                          {OUTCOME_ICON[r.outcome]} {r.outcome}
                        </span>
                        {r.legalBasis === 'faulty_goods' && <span style={basisChip}>30-day reject</span>}
                        {r.legalBasis === 'cooling_off' && <span style={basisChip}>14-day cancel</span>}
                        {r.legalBasis === 'warranty' && <span style={basisChip}>warranty</span>}
                      </button>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--grey-50)', marginTop: 2 }}>
                        {r.customerName} · {reasonLabel} · order {r.orderId} ·{' '}
                        {/* A return raised before the amount was recorded is not
                            a return worth nothing. £0.00 here would be read as
                            the figure to pay back. */}
                        {Number.isFinite(r.refundAmount)
                          ? `£${r.refundAmount.toFixed(2)}`
                          : <span className="ops-awaiting">Awaiting</span>}
                      </div>
                      {step && <p style={nextStepStyle}><strong>Next:</strong> {step.next}</p>}
                    </div>

                    {/* Two chips, because they answer two questions. The status
                        is what the record says; the step is how far through the
                        handoff it is. The owner colour is on the open ones only
                        — a closed return is nobody's job, and colouring it as
                        though it were is how finished work gets worked twice. */}
                    <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={step ? 'ops-chip ops-chip-returns' : 'ops-chip'}>
                        {RETURN_STATUS_LABEL[r.status]}
                      </span>
                      {step && <span className="ops-chip">{step.step}</span>}
                    </span>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {NEXT_STATUSES[r.status].map(next => (
                        <button
                          key={next}
                          type="button"
                          onClick={() => move(r, next)}
                          disabled={busyId === r.id}
                          className={next === 'rejected' ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                          style={next === 'rejected' ? { color: 'var(--color-sale)', borderColor: '#fecaca' } : undefined}
                        >
                          {busyId === r.id
                            ? <Loader2 size={13} className="admin-spin" />
                            : next === 'approved' ? <><Check size={13} /> Approve</>
                            : next === 'rejected' ? <><X size={13} /> Decline</>
                            : next === 'received' ? <><PackageCheck size={13} /> Mark received</>
                            : <><RotateCcw size={13} /> Resolve</>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {open && (
                    <div style={detailStyle}>
                      {r.note && (
                        <p style={{ margin: '0 0 10px' }}>
                          <strong>Customer said:</strong> {r.note}
                        </p>
                      )}
                      {r.staffNote && (
                        <p style={{ margin: '0 0 10px' }}>
                          <strong>Staff note:</strong> {r.staffNote}
                        </p>
                      )}
                      <p style={{ margin: '0 0 10px' }}>
                        <strong>Items:</strong>{' '}
                        {r.items.map(i => `${i.brand} ${i.model} ×${i.quantity}`).join(', ')}
                      </p>
                      <p style={{ margin: '0 0 10px' }}>
                        <strong>Contact:</strong> {r.customerEmail}
                      </p>

                      {r.photoUrls.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 10px' }}>
                          {r.photoUrls.map((url, i) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer"
                               style={{ width: 72, height: 72, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--grey-20)', display: 'block' }}>
                              <img src={url} alt={`Evidence ${i + 1} for ${r.id}`} loading="lazy"
                                   style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </a>
                          ))}
                        </div>
                      )}

                      <ol style={{ margin: 0, paddingLeft: 18 }}>
                        {r.history.map((h, i) => (
                          <li key={i} style={{ fontSize: 12.5, color: 'var(--grey-60)' }}>
                            {RETURN_STATUS_LABEL[h.status]} — {new Date(h.at).toLocaleString('en-GB')} ({h.by})
                            {h.note ? ` · ${h.note}` : ''}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* The two figures in the header that look like they disagree. They
            count different things on purpose, and saying so here is cheaper
            than someone reconciling them by hand on the Resolved tab. Dropped
            when there is nothing on screen for it to qualify. */}
        {rows.length > 0 && (
        <p className="ops-footnote">
          Shown counts the tab you are on. Needing action counts only the open returns within it,
          so the two match on Open and nowhere else.
        </p>
        )}
      </div>
    </div>
  );
}

function Banner({ tone, children, onDismiss }: { tone: 'success' | 'error'; children: React.ReactNode; onDismiss: () => void }) {
  const ok = tone === 'success';
  return (
    <div role={ok ? 'status' : 'alert'} style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: ok ? 'var(--color-trust)' : 'var(--color-sale-subtle)',
      border: `1px solid ${ok ? 'var(--green-20)' : '#fecaca'}`,
      color: ok ? 'var(--color-trust-text)' : '#991b1b',
      borderRadius: 'var(--radius-md)', padding: '10px 12px',
      fontFamily: 'var(--font-body)', fontSize: 13.5, lineHeight: 1.5,
    }}>
      {ok ? <Check size={15} style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />}
      <span style={{ flex: 1 }}>{children}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss message"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2 }}>
        <X size={15} />
      </button>
    </div>
  );
}

const emptyStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--grey-50)',
  textAlign: 'center', padding: 'var(--spacing-48) 0',
};

const nextStepStyle: React.CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: 12.5, lineHeight: 1.5,
  color: 'var(--grey-60)', margin: '5px 0 0', maxWidth: '56ch',
};

const outcomeChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
  borderRadius: 'var(--radius-full)', background: 'var(--grey-5)',
  border: '1px solid var(--grey-20)', fontFamily: 'var(--font-body)',
  fontSize: 11.5, fontWeight: 600, color: 'var(--grey-70)', textTransform: 'capitalize',
};

const basisChip: React.CSSProperties = {
  padding: '2px 8px', borderRadius: 'var(--radius-full)',
  background: 'var(--grey-0)', border: '1px dashed var(--grey-30)',
  fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5,
  fontWeight: 600, color: 'var(--grey-60)', letterSpacing: '0.03em',
};

const detailStyle: React.CSSProperties = {
  marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--grey-10)',
  fontFamily: 'var(--font-body)', fontSize: 13.5, color: 'var(--grey-70)', lineHeight: 1.6,
};
