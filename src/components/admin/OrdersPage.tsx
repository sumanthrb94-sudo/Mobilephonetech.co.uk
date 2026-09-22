import { useCallback, useEffect, useState } from 'react';
import {
  Package, Loader2, AlertTriangle, Check, Truck, MapPin, Mail, Undo2, ChevronDown, Inbox,
  PackageCheck,
} from 'lucide-react';
import {
  listOrders, advanceOrder, resendConfirmation, refundOrder,
  orderStatusLabel, gbp, OPEN_STATUSES, STAGES, stageOf, nextAction,
  type AdminOrder,
} from '../../lib/orders';
import { describeError } from '../../lib/adminApi';

type Filter = 'open' | 'dispatched' | 'refunded' | 'all';

const STEP_LABEL: Record<string, string> = {
  paid: 'Paid',
  dispatched: 'In transit',
  'out-for-delivery': 'Out for delivery',
  delivered: 'Delivered',
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'open',       label: 'To pack' },
  { value: 'dispatched', label: 'On its way' },
  { value: 'refunded',   label: 'Refunded' },
  { value: 'all',        label: 'All' },
];

function matches(order: AdminOrder, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'open') return OPEN_STATUSES.includes(order.status);
  // Delivered belongs here too: an order does not stop existing when it
  // lands, and before this it dropped out of every tab except All.
  if (filter === 'dispatched') {
    return order.status === 'dispatched'
      || order.status === 'out-for-delivery'
      || order.status === 'delivered';
  }
  return order.status === 'refunded';
}

/** Status is the one thing staff scan for, so it is read by colour first. */
function chipClass(status: string): string {
  if (OPEN_STATUSES.includes(status)) return 'ord-chip ord-chip-topack';
  if (status === 'dispatched' || status === 'out-for-delivery') return 'ord-chip ord-chip-moving';
  if (status === 'delivered') return 'ord-chip ord-chip-done';
  return 'ord-chip ord-chip-refunded';
}

/**
 * An amount, or Awaiting where there is no amount to show.
 *
 * `gbp()` turns anything missing into £0.00, which is fine for a total that is
 * genuinely zero and wrong for one that was never recorded: a refund with no
 * figure against it is not a refund of nothing. The fragment matters — the
 * pounds stay a plain text node next to the words around them, so "Refunded
 * £199.00" is still one readable line rather than two boxes.
 */
function Amount({ value }: { value: number | null | undefined }) {
  return Number.isFinite(value)
    ? <>{gbp(value as number)}</>
    : <span className="ops-awaiting">Awaiting</span>;
}

const shortDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

/** Whether an order can be moved on in bulk — see the note above the bulk bar. */
function bulkEligible(status: string): boolean {
  return status === 'dispatched' || status === 'out-for-delivery';
}

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

  // Bulk move — dispatched -> out for delivery, or out for delivery ->
  // delivered. Deliberately NOT offered for the first move (paid -> dispatched):
  // that one needs a real, distinct tracking number typed per parcel, which is
  // exactly the one step bulk selection cannot shortcut honestly. The other two
  // moves need nothing new — the courier and tracking number are already on
  // the order from when it was dispatched — so a whole batch can go through
  // in one click with nothing to mistype.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Switching tabs can hide a selected row; clearing avoids a "3 selected"
  // that staff can no longer see or verify.
  useEffect(() => { setSelected(new Set()); }, [filter]);

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
  // Defaults to what is already saved on the order, not a blank box — an
  // order moving from dispatched to out for delivery already has a courier
  // and tracking number, and leaving the fields blank here would mail the
  // customer an "arriving today" notice with no tracking number on it.
  const field = (order: AdminOrder) =>
    dispatch[order.id] ?? { courier: order.courier ?? '', tracking: order.trackingNumber ?? '' };
  const setField = (order: AdminOrder, patch: Partial<{ courier: string; tracking: string }>) =>
    setDispatch(d => ({ ...d, [order.id]: { ...field(order), ...patch } }));

  const toggleSelect = (id: string) => setSelected(s => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const selectGroup = (ids: string[]) => setSelected(new Set(ids));

  const dispatchedVisible = visible.filter(o => o.status === 'dispatched');
  const outForDeliveryVisible = visible.filter(o => o.status === 'out-for-delivery');

  const selectedOrders = rows.filter(o => selected.has(o.id));
  const selectedStatuses = new Set(selectedOrders.map(o => o.status));
  // Only one meaning per click: a mixed selection has no single honest label
  // for what the button would do, so none is offered — same reasoning as the
  // single-order screen never showing more than the one move an order is
  // actually waiting for.
  const bulkKind: 'out-for-delivery' | 'delivered' | null =
    selectedStatuses.size === 1
      ? selectedStatuses.has('dispatched') ? 'out-for-delivery'
        : selectedStatuses.has('out-for-delivery') ? 'delivered'
          : null
      : null;

  const runBulk = async () => {
    if (!bulkKind) return;
    setBulkBusy(true);
    setError(null);
    setNotice(null);
    const ids = [...selected];
    const results = await Promise.allSettled(ids.map(id => {
      const order = rows.find(o => o.id === id);
      const action = order && nextAction(order.status);
      if (!order || !action) return Promise.reject(new Error('Order changed — refresh and try again.'));
      return advanceOrder(id, action, { courier: order.courier ?? '', trackingNumber: order.trackingNumber ?? '' });
    }));
    const failed = ids.filter((_, i) => results[i].status === 'rejected');
    const okCount = ids.length - failed.length;
    const doneWord = bulkKind === 'out-for-delivery' ? 'out for delivery' : 'delivered';
    if (okCount > 0) setNotice(`${okCount} order${okCount === 1 ? '' : 's'} marked ${doneWord}.`);
    if (failed.length > 0) {
      setError(`${failed.length} order${failed.length === 1 ? '' : 's'} could not be updated — still selected, try again.`);
    }
    setSelected(new Set(failed));
    setBulkBusy(false);
    await load();
  };

  return (
    <div className="ops-stack">
      <div className="ops-head">
        <div>
          <p className="ops-eyebrow">Operations</p>
          <h1 className="ops-title">Orders</h1>
          <p className="ops-question">
            What has to be packed today, and what is already out with a courier?
          </p>
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

        {/* The two counts that look wrong together. "On its way" holds delivered
            orders as well as moving ones, which is deliberate — an order does
            not stop existing when it lands, and before that it dropped out of
            every tab except All. Said here so it reads as arithmetic rather
            than as a bug someone should go and fix. */}
        <p className="ops-footnote">
          Counts cover the most recent 500 orders. On its way includes orders already
          delivered, so it will be larger than the number of parcels actually moving.
        </p>

        {/* Bulk move — appears once there is something to move together.
            Nothing to select on "To pack": that first move needs a real,
            distinct tracking number typed per parcel, so it stays one order
            at a time regardless of how many rows are showing. */}
        {(selected.size > 0 || dispatchedVisible.length > 0 || outForDeliveryVisible.length > 0) && (
          <div className="ord-bulkbar" role="group" aria-label="Bulk order actions">
            {selected.size === 0 ? (
              <>
                {dispatchedVisible.length > 0 && (
                  <button
                    type="button"
                    className="admin-ghost"
                    onClick={() => selectGroup(dispatchedVisible.map(o => o.id))}
                  >
                    Select all in transit ({dispatchedVisible.length})
                  </button>
                )}
                {outForDeliveryVisible.length > 0 && (
                  <button
                    type="button"
                    className="admin-ghost"
                    onClick={() => selectGroup(outForDeliveryVisible.map(o => o.id))}
                  >
                    Select all out for delivery ({outForDeliveryVisible.length})
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="ord-bulkbar__count">{selected.size} selected</span>
                <button type="button" className="admin-ghost" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
                  Clear
                </button>
                {bulkKind ? (
                  <button type="button" className="btn btn-secondary btn-md" disabled={bulkBusy} onClick={() => void runBulk()}>
                    {bulkBusy
                      ? <Loader2 size={15} className="admin-spin" />
                      : bulkKind === 'out-for-delivery' ? <MapPin size={15} /> : <PackageCheck size={15} />}
                    {bulkKind === 'out-for-delivery'
                      ? `Mark ${selected.size} out for delivery`
                      : `Mark ${selected.size} delivered`}
                  </button>
                ) : (
                  <span className="ord-bulkbar__hint">Select orders at the same stage to update them together.</span>
                )}
              </>
            )}
          </div>
        )}

        {loading && rows.length === 0 && (
          <p className="ord-empty"><Loader2 size={18} className="admin-spin" /> Loading orders…</p>
        )}

        {/* An empty queue and a failed read drew the same line before this, and
            they mean opposite things: one says there is nothing to pack, the
            other says nobody here knows what there is to pack. */}
        {!loading && visible.length === 0 && (
          error && rows.length === 0 ? (
            <div className="ord-empty" role="status">
              <AlertTriangle size={22} style={{ color: 'var(--color-sale)' }} />
              <span className="ops-chip">Could not load</span>
              <p style={{ margin: 0 }}>
                The order book could not be read. This is not an empty queue — refresh to try again.
              </p>
            </div>
          ) : (
            <div className="ord-empty">
              <Inbox size={22} />
              <p style={{ margin: 0 }}>
                {filter === 'open' ? 'Nothing waiting to be packed.' : 'No orders here.'}
              </p>
            </div>
          )
        )}

        {visible.map(order => {
          const open = expanded === order.id;
          const busy = busyId === order.id;
          const refunded = order.status === 'refunded';
          const next = nextAction(order.status);
          const f = field(order);
          const panelId = `order-${order.id}`;
          const selectable = bulkEligible(order.status);

          return (
            <div key={order.id} className="ord-card">
              <div className="ord-row">
                {selectable ? (
                  <span className="ord-select">
                    <input
                      type="checkbox"
                      checked={selected.has(order.id)}
                      disabled={bulkBusy}
                      onChange={() => toggleSelect(order.id)}
                      aria-label={`Select order ${order.id}`}
                    />
                  </span>
                ) : (
                  <span className="ord-select ord-select--spacer" aria-hidden="true" />
                )}
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

                <span className="ord-money"><Amount value={order.total} /></span>
                <span className={chipClass(order.status)}>{orderStatusLabel(order.status)}</span>
                <ChevronDown size={17} className={open ? 'ord-caret ord-caret-open' : 'ord-caret'} />
              </button>
              </div>

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

                  {/* Where this order actually is. The chip in the header
                      says the same thing in one word; this says what has
                      happened and what has not, which is the question staff
                      are answering when they open a row. */}
                  {!refunded && (
                    <ol className="ord-steps" aria-label="Order progress">
                      {STAGES.map(stage => {
                        const at = stageOf(order.status);
                        const here = STAGES.indexOf(at ?? 'paid');
                        const i = STAGES.indexOf(stage);
                        const state = i < here ? 'done' : i === here ? 'now' : 'todo';
                        return (
                          <li key={stage} data-state={state}>
                            <span className="ord-steps__dot" aria-hidden="true" />
                            <span className="ord-steps__label">{STEP_LABEL[stage]}</span>
                          </li>
                        );
                      })}
                    </ol>
                  )}

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
                        {/* No falling back to the order total. A refund with
                            no amount recorded may well have been a partial one,
                            and printing the full total states that the whole
                            lot went back — which nobody has checked. */}
                        <span>
                          Refunded <Amount value={order.refundedAmount} />
                          {order.refundedAt ? ` on ${shortDate(order.refundedAt)}` : ''}
                        </span>
                      </span>
                    )}
                  </div>

                  {!refunded && (
                    <>
                      {/* Only while there is a movement to record. Asking for
                          a tracking number when the parcel is already out for
                          delivery invites someone to overwrite a good one. */}
                      {next?.needsTracking && (
                      <div className="ord-fields">
                        <div className="ord-field">
                          <label htmlFor={`courier-${order.id}`}>Courier</label>
                          <input
                            id={`courier-${order.id}`}
                            className="input"
                            value={f.courier}
                            placeholder="Royal Mail"
                            onChange={e => setField(order, { courier: e.target.value })}
                          />
                        </div>
                        <div className="ord-field">
                          <label htmlFor={`tracking-${order.id}`}>Tracking number</label>
                          <input
                            id={`tracking-${order.id}`}
                            className="input"
                            value={f.tracking}
                            placeholder="AB123456789GB"
                            onChange={e => setField(order, { tracking: e.target.value })}
                          />
                        </div>
                      </div>
                      )}

                      <div className="ord-actions">
                        {/* One button, not four. An order stands at exactly one
                            stage and is waiting for exactly one thing; the
                            screen used to offer every move at every stage, so
                            an order already out for delivery still offered to
                            dispatch it. The server refuses that now too — see
                            api/_orderFlow.ts — this is what stops staff being
                            asked to guess in the first place. */}
                        {next && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-md"
                            disabled={busy}
                            onClick={() => void run(order.id, next.done, () =>
                              advanceOrder(order.id, next, { courier: f.courier, trackingNumber: f.tracking }))}
                          >
                            {busy
                              ? <Loader2 size={15} className="admin-spin" />
                              : next.kind === 'dispatched' ? <Truck size={15} />
                              : next.kind === 'out-for-delivery' ? <MapPin size={15} />
                              : <PackageCheck size={15} />}
                            {next.label}
                          </button>
                        )}

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
                            Refund <strong><Amount value={order.total} /></strong> to {order.customer} and put the stock back?
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
