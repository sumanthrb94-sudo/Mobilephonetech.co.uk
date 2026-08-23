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

  return (
    <div className="ops-stack">
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">LeHart back office</p>
          <h1 className="ops-title">Returns</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--grey-50)', margin: '4px 0 0' }}>
            {loading ? 'Loading…' : `${rows.length} shown · ${openCount} needing action`}
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
                        {r.customerName} · {reasonLabel} · order {r.orderId} · £{r.refundAmount.toFixed(2)}
                      </div>
                    </div>

                    <span style={{ ...statusChip, ...statusTone(r.status) }}>{RETURN_STATUS_LABEL[r.status]}</span>

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

const statusChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', minHeight: 26, padding: '0 10px',
  borderRadius: 'var(--radius-full)', fontFamily: 'var(--font-sans)',
  fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
};

const statusTone = (s: ReturnStatus): React.CSSProperties => {
  if (s === 'resolved') return { background: 'var(--color-trust)', color: 'var(--color-trust-text)' };
  if (s === 'rejected' || s === 'cancelled') return { background: 'var(--grey-10)', color: 'var(--grey-60)' };
  if (s === 'received') return { background: 'var(--color-warn-subtle)', color: '#92400e' };
  return { background: 'var(--color-brand-subtle)', color: 'var(--brand-cyan-hover)' };
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
