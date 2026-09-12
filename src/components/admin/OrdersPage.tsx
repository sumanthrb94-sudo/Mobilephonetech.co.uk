import { useCallback, useEffect, useState } from 'react';
import {
  Package, Loader2, AlertTriangle, Check, Truck, MapPin, Mail, Undo2, ChevronDown, Inbox,
} from 'lucide-react';
import {
  listOrders, markDispatched, markOutForDelivery, resendConfirmation, refundOrder,
  orderStatusLabel, gbp, OPEN_STATUSES, type AdminOrder,
} from '../../lib/orders';
import { describeError } from '../../lib/adminApi';

type Filter = 'open' | 'dispatched' | 'refunded' | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'open',       label: 'To pack' },
  { value: 'dispatched', label: 'On its way' },
  { value: 'refunded',   label: 'Refunded' },
  { value: 'all',        label: 'All' },
];

function matches(order: AdminOrder, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'open') return OPEN_STATUSES.includes(order.status);
  if (filter === 'dispatched') return order.status === 'dispatched' || order.status === 'out-for-delivery';
  return order.status === 'refunded';
}

export default function OrdersPage() {
  const [rows, setRows] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState<Filter>('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Courier and tracking, per expanded order. Kept keyed by id so switching
  // between orders cannot carry one order's tracking number onto another.
  const [dispatch, setDispatch] = useState<Record<string, { courier: string; tracking: string }>>({});
  /** The order whose refund is one click from happening. */
  const [confirmRefund, setConfirmRefund] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listOrders());
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const run = async (id: string, what: string, action: () => Promise<void>) => {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(`${id} — ${what}`);
      setConfirmRefund(null);
      await load();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusyId(null);
    }
  };

  const visible = rows.filter(o => matches(o, filter));
  const field = (id: string) => dispatch[id] ?? { courier: '', tracking: '' };
  const setField = (id: string, patch: Partial<{ courier: string; tracking: string }>) =>
    setDispatch(d => ({ ...d, [id]: { ...field(id), ...patch } }));

  return (
    <div className="ops-stack">
      <div className="ops-head">
        <div>
          <p className="ops-eyebrow">Operations</p>
          <h1 className="ops-title">Orders</h1>
        </div>
        <button type="button" className="btn btn-secondary btn-md" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 size={15} className="admin-spin" /> : <Package size={15} />}
          Refresh
        </button>
      </div>

      <div className="admin-toolbar" role="tablist" aria-label="Filter orders">
        {FILTERS.map(f => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            className={filter === f.value ? 'btn btn-secondary btn-md' : 'admin-ghost'}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
            {' '}
            <span style={{ opacity: .6 }}>{rows.filter(o => matches(o, f.value)).length}</span>
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="admin-panel" style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--color-sale)' }}>
          <AlertTriangle size={15} /> {error}
        </p>
      )}
      {notice && (
        <p role="status" className="admin-panel" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Check size={15} /> {notice}
        </p>
      )}

      {loading && rows.length === 0 && (
        <p className="admin-panel"><Loader2 size={15} className="admin-spin" /> Loading orders…</p>
      )}

      {!loading && visible.length === 0 && (
        <div className="admin-panel" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <Inbox size={22} style={{ opacity: .5 }} />
          <p style={{ margin: '10px 0 0' }}>
            {filter === 'open' ? 'Nothing waiting to be packed.' : 'No orders here.'}
          </p>
        </div>
      )}

      {visible.map(order => {
        const open = expanded === order.id;
        const busy = busyId === order.id;
        const refunded = order.status === 'refunded';
        const f = field(order.id);

        return (
          <div key={order.id} className="admin-panel">
            <div className="admin-row">
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>{order.id}</strong>
                <p style={{ margin: '2px 0 0', fontSize: 13, opacity: .75 }}>
                  {order.customer} · {order.items.length} item{order.items.length === 1 ? '' : 's'}
                  {order.createdAt ? ` · ${new Date(order.createdAt).toLocaleDateString('en-GB')}` : ''}
                </p>
              </div>

              <span style={{ fontWeight: 600 }}>{gbp(order.total)}</span>
              <span style={{ fontSize: 13, opacity: .8 }}>{orderStatusLabel(order.status)}</span>

              <button
                type="button"
                className="admin-ghost"
                aria-expanded={open}
                onClick={() => setExpanded(open ? null : order.id)}
              >
                <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
                {open ? 'Close' : 'Open'}
              </button>
            </div>

            {open && (
              <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>
                <div>
                  {order.items.map((it, i) => (
                    <p key={i} style={{ margin: '0 0 4px', fontSize: 14 }}>
                      {it.quantity} × {it.name} — {gbp(it.price * it.quantity)}
                    </p>
                  ))}
                </div>

                <div style={{ fontSize: 13, opacity: .8 }}>
                  <p style={{ margin: '0 0 4px', display: 'flex', gap: 6 }}>
                    <MapPin size={14} /> {order.address.join(', ') || 'No address recorded'}
                  </p>
                  <p style={{ margin: 0, display: 'flex', gap: 6 }}>
                    <Mail size={14} /> {order.contactEmail || 'No email recorded'}
                  </p>
                  {order.trackingNumber && (
                    <p style={{ margin: '4px 0 0', display: 'flex', gap: 6 }}>
                      <Truck size={14} /> {order.courier} · {order.trackingNumber}
                    </p>
                  )}
                  {refunded && (
                    <p style={{ margin: '4px 0 0' }}>
                      Refunded {gbp(Number(order.refundedAmount ?? order.total))}
                      {order.refundedAt ? ` on ${new Date(order.refundedAt).toLocaleDateString('en-GB')}` : ''}
                    </p>
                  )}
                </div>

                {!refunded && (
                  <>
                    <div className="admin-row">
                      <label htmlFor={`courier-${order.id}`} style={{ fontSize: 13 }}>Courier</label>
                      <input
                        id={`courier-${order.id}`}
                        value={f.courier}
                        placeholder="Royal Mail"
                        onChange={e => setField(order.id, { courier: e.target.value })}
                      />
                      <label htmlFor={`tracking-${order.id}`} style={{ fontSize: 13 }}>Tracking</label>
                      <input
                        id={`tracking-${order.id}`}
                        value={f.tracking}
                        placeholder="AB123456789GB"
                        onChange={e => setField(order.id, { tracking: e.target.value })}
                      />
                    </div>

                    <div className="admin-toolbar">
                      <button
                        type="button"
                        className="btn btn-secondary btn-md"
                        disabled={busy}
                        onClick={() => void run(order.id, 'marked dispatched, customer emailed', () =>
                          markDispatched(order.id, { courier: f.courier, trackingNumber: f.tracking }))}
                      >
                        <Truck size={15} /> Mark dispatched
                      </button>

                      <button
                        type="button"
                        className="admin-ghost"
                        disabled={busy}
                        onClick={() => void run(order.id, 'marked out for delivery', () =>
                          markOutForDelivery(order.id, { courier: f.courier, trackingNumber: f.tracking }))}
                      >
                        Out for delivery
                      </button>

                      <button
                        type="button"
                        className="admin-ghost"
                        disabled={busy}
                        onClick={() => void run(order.id, 'receipt re-sent', () => resendConfirmation(order.id))}
                      >
                        <Mail size={15} /> Resend receipt
                      </button>
                    </div>

                    {/* Refunding moves real money and cannot be undone from here,
                        so it takes two deliberate clicks rather than one. */}
                    <div className="admin-toolbar">
                      {confirmRefund === order.id ? (
                        <>
                          <span style={{ fontSize: 13 }}>
                            Refund {gbp(order.total)} and put the stock back?
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary btn-md"
                            disabled={busy}
                            onClick={() => void run(order.id, `refunded ${gbp(order.total)}, stock restored`, () => refundOrder(order.id))}
                          >
                            {busy ? <Loader2 size={15} className="admin-spin" /> : <Undo2 size={15} />}
                            Yes, refund
                          </button>
                          <button type="button" className="admin-ghost" onClick={() => setConfirmRefund(null)}>
                            Keep it
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="admin-ghost"
                          disabled={busy}
                          onClick={() => setConfirmRefund(order.id)}
                        >
                          <Undo2 size={15} /> Refund &amp; restock
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
