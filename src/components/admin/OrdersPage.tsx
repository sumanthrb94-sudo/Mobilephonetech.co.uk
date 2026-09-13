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

/** Status is the one thing staff scan for, so it is read by colour first. */
function chipClass(status: string): string {
  if (OPEN_STATUSES.includes(status)) return 'ord-chip ord-chip-topack';
  if (status === 'dispatched' || status === 'out-for-delivery') return 'ord-chip ord-chip-moving';
  if (status === 'delivered') return 'ord-chip ord-chip-done';
  return 'ord-chip ord-chip-refunded';
}

const shortDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

export default function OrdersPage() {
  const [rows, setRows] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState<Filter>('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Keyed by order id so switching between orders cannot carry one order's
  // tracking number onto another.
  const [dispatch, setDispatch] = useState<Record<string, { courier: string; tracking: string }>>({});
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

      {error && (
        <p role="alert" className="admin-panel ord-fact" style={{ padding: 14, color: 'var(--color-sale)' }}>
          <AlertTriangle size={16} /> {error}
        </p>
      )}
      {notice && (
        <p role="status" className="admin-panel ord-fact" style={{ padding: 14 }}>
          <Check size={16} /> {notice}
        </p>
      )}

      <div className="admin-panel">
        <div className="admin-toolbar" role="tablist" aria-label="Filter orders">
          {FILTERS.map(f => {
            const count = rows.filter(o => matches(o, f.value)).length;
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={filter === f.value}
                className={filter === f.value ? 'btn btn-secondary btn-md' : 'admin-ghost'}
                onClick={() => setFilter(f.value)}
              >
                {f.label}
                <span style={{ opacity: .55, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
              </button>
            );
          })}
        </div>

        {loading && rows.length === 0 && (
          <p className="ord-empty"><Loader2 size={18} className="admin-spin" /> Loading orders…</p>
        )}

        {!loading && visible.length === 0 && (
          <div className="ord-empty">
            <Inbox size={22} />
            <p style={{ margin: 0 }}>
              {filter === 'open' ? 'Nothing waiting to be packed.' : 'No orders here.'}
            </p>
          </div>
        )}

        {visible.map(order => {
          const open = expanded === order.id;
          const busy = busyId === order.id;
          const refunded = order.status === 'refunded';
          const f = field(order.id);
          const panelId = `order-${order.id}`;

          return (
            <div key={order.id} className="ord-card">
              <button
                type="button"
                className="ord-head"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setExpanded(open ? null : order.id)}
              >
                <span className="ord-ref">
                  <span className="ord-id">{order.id}</span>
                  <span className="ord-meta" style={{ display: 'block' }}>
                    {order.customer} · {order.items.length} item{order.items.length === 1 ? '' : 's'}
                    {order.createdAt ? ` · ${shortDate(order.createdAt)}` : ''}
                  </span>
                </span>

                <span className="ord-money">{gbp(order.total)}</span>
                <span className={chipClass(order.status)}>{orderStatusLabel(order.status)}</span>
                <ChevronDown size={17} className={open ? 'ord-caret ord-caret-open' : 'ord-caret'} />
              </button>

              {open && (
                <div className="ord-body" id={panelId}>
                  <div className="ord-items">
                    {order.items.map((it, i) => (
                      <div key={i} className="ord-item">
                        <span>{it.quantity} × {it.name}</span>
                        <span>{gbp(it.price * it.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="ord-facts">
                    <span className="ord-fact">
                      <MapPin size={15} />
                      <span>{order.address.join(', ') || 'No address recorded'}</span>
                    </span>
                    <span className="ord-fact">
                      <Mail size={15} />
                      <span>{order.contactEmail || 'No email recorded'}</span>
                    </span>
                    {order.trackingNumber && (
                      <span className="ord-fact">
                        <Truck size={15} />
                        <span>{order.courier} · {order.trackingNumber}</span>
                      </span>
                    )}
                    {refunded && (
                      <span className="ord-fact">
                        <Undo2 size={15} />
                        <span>
                          Refunded {gbp(Number(order.refundedAmount ?? order.total))}
                          {order.refundedAt ? ` on ${shortDate(order.refundedAt)}` : ''}
                        </span>
                      </span>
                    )}
                  </div>

                  {!refunded && (
                    <>
                      <div className="ord-fields">
                        <div className="ord-field">
                          <label htmlFor={`courier-${order.id}`}>Courier</label>
                          <input
                            id={`courier-${order.id}`}
                            className="input"
                            value={f.courier}
                            placeholder="Royal Mail"
                            onChange={e => setField(order.id, { courier: e.target.value })}
                          />
                        </div>
                        <div className="ord-field">
                          <label htmlFor={`tracking-${order.id}`}>Tracking number</label>
                          <input
                            id={`tracking-${order.id}`}
                            className="input"
                            value={f.tracking}
                            placeholder="AB123456789GB"
                            onChange={e => setField(order.id, { tracking: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="ord-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-md"
                          disabled={busy}
                          onClick={() => void run(order.id, 'dispatched, customer notified', () =>
                            markDispatched(order.id, { courier: f.courier, trackingNumber: f.tracking }))}
                        >
                          {busy ? <Loader2 size={15} className="admin-spin" /> : <Truck size={15} />}
                          Mark dispatched
                        </button>

                        <button
                          type="button"
                          className="admin-ghost"
                          disabled={busy}
                          onClick={() => void run(order.id, 'out for delivery', () =>
                            markOutForDelivery(order.id, { courier: f.courier, trackingNumber: f.tracking }))}
                        >
                          <MapPin size={15} /> Out for delivery
                        </button>

                        <button
                          type="button"
                          className="admin-ghost"
                          disabled={busy}
                          onClick={() => void run(order.id, 'receipt re-sent', () => resendConfirmation(order.id))}
                        >
                          <Mail size={15} /> Resend receipt
                        </button>

                        {confirmRefund !== order.id && (
                          <button
                            type="button"
                            className="admin-ghost-danger"
                            disabled={busy}
                            onClick={() => setConfirmRefund(order.id)}
                          >
                            <Undo2 size={15} /> Refund &amp; restock
                          </button>
                        )}
                      </div>

                      {/* Money leaving takes two deliberate steps, on a surface
                          that does not look like the buttons above it. */}
                      {confirmRefund === order.id && (
                        <div className="ord-confirm" role="group" aria-label="Confirm refund">
                          <span>
                            Refund <strong>{gbp(order.total)}</strong> to {order.customer} and put the stock back?
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
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
