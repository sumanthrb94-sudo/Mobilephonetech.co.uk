import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Check, FileWarning, Inbox, Library, Loader2, RefreshCw,
} from 'lucide-react';
import {
  listCatalogueModels, listModelRequests, addCatalogueModel, retireCatalogueModel,
  restoreCatalogueModel, approveModelRequest, declineModelRequest, planImport, applyImport,
  modelNameProblem, findCatalogueModel, modelKey,
  type CatalogueModel, type ModelRequest, type ImportPlan,
} from '../../lib/catalogue';
import { listInventory, describeError, INVENTORY_READ_CAP } from '../../lib/adminApi';
import type { Product } from '../../types';

/**
 * Catalogue — the models staff may list, and the requests for ones they may not.
 *
 * Staff can no longer type a brand or a model; they pick one from here. So
 * when a phone is missing, the member of staff holding it cannot do their job
 * until a manager answers their request, and this page is the only place a
 * manager can. That is why the queue comes first and the list of models
 * second: one is people waiting, the other is reference.
 *
 * The exception is a catalogue with nothing in it. Then no member of staff can
 * list anything at all, whatever they are holding, and importing the models
 * the shop already sells outranks every individual request — so that section
 * moves to the top and says so.
 *
 * Every write re-reads the page rather than patching local state. The writes
 * here are rare and consequential, and a manager who has just approved a
 * model should be looking at what the database now holds, not at what this
 * component guessed it would.
 */
export default function CataloguePage() {
  const [catalogue, setCatalogue] = useState<Read<CatalogueModel[]>>(LOADING);
  const [open, setOpen] = useState<Read<ModelRequest[]>>(LOADING);
  const [history, setHistory] = useState<Read<ModelRequest[]>>(LOADING);
  const [listings, setListings] = useState<Read<{ products: Product[]; truncated: boolean }>>(LOADING);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ where: Where; text: string } | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const load = useCallback(async () => {
    setRefreshing(true);
    // The open queue is read on its own rather than filtered out of the full
    // history. Both reads are capped, and a shop with a long history of
    // decided requests would otherwise push a request made this morning off
    // the end of the read — the one row this page exists to show.
    const [cat, openReqs, allReqs, inv] = await Promise.allSettled([
      listCatalogueModels(),
      listModelRequests('open'),
      listModelRequests(),
      listInventory({ archived: 'all', pageSize: 5000 }),
    ]);
    if (!mounted.current) return;
    setCatalogue(settled(cat));
    setOpen(settled(openReqs));
    setHistory(settled(allReqs, rs => rs.filter(r => r.status !== 'open')));
    setListings(settled(inv, v => ({ products: v.products, truncated: v.truncated })));
    setReadAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    setRefreshing(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  /**
   * Run one write, then re-read. Returns the error to show beside the control
   * that caused it, or null on success. The error goes beside the control
   * rather than at the top of the page because the top of the page is
   * usually scrolled away by the time someone presses Retire on a model
   * forty rows down.
   */
  const run = useCallback(async (key: string, where: Where, work: () => Promise<string>) => {
    setBusy(key);
    setNotice(null);
    try {
      const text = await work();
      if (mounted.current) setNotice({ where, text });
      await load();
      return null;
    } catch (err) {
      return describeError(err);
    } finally {
      if (mounted.current) setBusy(null);
    }
  }, [load]);

  const models = catalogue.state === 'ok' ? catalogue.value : null;
  const products = listings.state === 'ok' ? listings.value.products : null;
  const catalogueEmpty = models !== null && models.length === 0;

  const usage = useMemo(
    () => (models && products ? usageByModel(models, products) : null),
    [models, products],
  );
  const plan = useMemo(
    () => (models && products ? planImport(products, models) : null),
    [models, products],
  );

  const importSection = (
    <ImportSection
      catalogue={catalogue}
      listings={listings}
      plan={plan}
      busy={busy}
      notice={notice?.where === 'import' ? notice.text : null}
      onImport={p => run('import', 'import', async () => {
        const n = await applyImport(p);
        return `Imported ${n} model${n === 1 ? '' : 's'}. Staff can pick ${n === 1 ? 'it' : 'them'} from now on.`;
      })}
    />
  );

  return (
    <div className="ops-stack">
      <header className="ops-head">
        <div>
          <p className="ops-eyebrow">LeHart back office</p>
          <h1 className="ops-title">Catalogue</h1>
          <p className="ops-question">
            Which phones can staff list — and what are they waiting on you to add?
          </p>
        </div>
        <button
          type="button" className="btn btn-secondary btn-md" onClick={() => void load()}
          disabled={refreshing} aria-label="Refresh catalogue"
        >
          <RefreshCw size={15} className={refreshing ? 'admin-spin' : undefined} /> Refresh
        </button>
      </header>

      {catalogueEmpty && (
        <div role="alert" className="ops-alert">
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            The catalogue is empty, so staff cannot create any listing — there is nothing for
            them to pick, and the database refuses a model that is not in it.{' '}
            {plan && plan.toAdd.length > 0
              ? 'Import the models your existing listings use, just below, before anything else.'
              : 'Add the models the shop sells under Models.'}
          </span>
        </div>
      )}

      {catalogueEmpty && importSection}

      <RequestsSection
        open={open}
        history={history}
        catalogue={catalogue}
        busy={busy}
        notice={notice?.where === 'requests' ? notice.text : null}
        onApprove={(r, spelling, existing) => run(`approve:${r.id}`, 'requests', async () => {
          const entry = await approveModelRequest(r, spelling, existing);
          return `${entry.brand} ${entry.model} approved. ${r.requestedBy || 'Whoever asked'} can pick it now.`;
        })}
        onDecline={(r, reason) => run(`decline:${r.id}`, 'requests', async () => {
          await declineModelRequest(r, reason);
          return `Declined ${r.brand} ${r.model}. ${r.requestedBy || 'Whoever asked'} will see your reason.`;
        })}
      />

      <ModelsSection
        catalogue={catalogue}
        usage={usage}
        listingsFailed={listings.state === 'failed'}
        truncated={listings.state === 'ok' && listings.value.truncated}
        busy={busy}
        notice={notice?.where === 'models' ? notice.text : null}
        onRetire={m => run(`retire:${m.id}`, 'models', async () => {
          await retireCatalogueModel(m.id);
          return `${m.brand} ${m.model} retired. New listings cannot choose it; existing ones keep it.`;
        })}
        onRestore={m => run(`restore:${m.id}`, 'models', async () => {
          await restoreCatalogueModel(m.id);
          return `${m.brand} ${m.model} is back in the staff picker.`;
        })}
        onAdd={(brand, model, existing) => run('add', 'models', async () => {
          const entry = await addCatalogueModel(brand, model, existing);
          return `${entry.brand} ${entry.model} is in the catalogue. Staff can pick it now.`;
        })}
      />

      {!catalogueEmpty && importSection}

      {/* Nothing here updates by itself. A request filed while this tab sat
          open does not appear until Refresh, and the stamp is what says so. */}
      <p className="ops-audit">
        {readAt
          ? `Read at ${readAt} · the catalogue, the request queue and every listing · Refresh re-reads all three`
          : 'Not read yet'}
      </p>
    </div>
  );
}

// ── Requests ───────────────────────────────────────────────────

type Outcome = Promise<string | null>;

function RequestsSection({
  open, history, catalogue, busy, notice, onApprove, onDecline,
}: {
  open: Read<ModelRequest[]>;
  history: Read<ModelRequest[]>;
  catalogue: Read<CatalogueModel[]>;
  busy: string | null;
  notice: string | null;
  onApprove: (r: ModelRequest, spelling: { brand: string; model: string }, existing: CatalogueModel[]) => Outcome;
  onDecline: (r: ModelRequest, reason: string) => Outcome;
}) {
  const waiting = open.state === 'ok' ? open.value.length : null;
  return (
    <Panel
      title="Requests"
      question="Who is waiting on you, and for which phone? Each one is a listing that cannot be made until you answer."
      hint={waiting === null ? undefined : `${waiting} waiting`}
    >
      {notice && <Notice text={notice} />}
      {open.state === 'loading' ? (
        <Skeleton rows={2} />
      ) : open.state === 'failed' ? (
        <LoadFailed>
          The request queue could not be read, so this is not an empty queue — it is an unknown
          one, and someone may be waiting. {open.error} Refresh to try again.
        </LoadFailed>
      ) : open.value.length === 0 ? (
        <Empty
          icon={<Inbox size={26} />}
          text="Nobody is waiting on you. When staff need a phone the catalogue lacks, their request lands here."
        />
      ) : (
        <ul className="ops-list">
          {open.value.map(r => (
            <RequestRow
              key={r.id}
              request={r}
              catalogue={catalogue.state === 'ok' ? catalogue.value : null}
              busy={busy}
              onApprove={onApprove}
              onDecline={onDecline}
            />
          ))}
        </ul>
      )}
      <DecidedHistory history={history} catalogue={catalogue.state === 'ok' ? catalogue.value : []} />
    </Panel>
  );
}

function RequestRow({
  request: r, catalogue, busy, onApprove, onDecline,
}: {
  request: ModelRequest;
  catalogue: CatalogueModel[] | null;
  busy: string | null;
  onApprove: (r: ModelRequest, spelling: { brand: string; model: string }, existing: CatalogueModel[]) => Outcome;
  onDecline: (r: ModelRequest, reason: string) => Outcome;
}) {
  const [mode, setMode] = useState<'idle' | 'approve' | 'decline'>('idle');
  const [brand, setBrand] = useState(r.brand);
  const [model, setModel] = useState(r.model);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ids = useId();
  const asked = `${r.brand} ${r.model}`;
  const working = busy === `approve:${r.id}` || busy === `decline:${r.id}`;

  const filedBrand = catalogue ? catalogueBrand(catalogue, brand) : brand.trim();
  const problem = model.trim() ? modelNameProblem(model) : null;
  const match = catalogue ? findCatalogueModel(catalogue, filedBrand, model) : undefined;

  const approve = async () => {
    if (!catalogue) return;
    setError(null);
    setError(await onApprove(r, { brand: filedBrand, model: model.trim() }, catalogue));
  };
  const decline = async () => {
    setError(null);
    setError(await onDecline(r, reason));
  };

  return (
    <li className="ops-list-row" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ minWidth: 0, flex: '1 1 14rem' }}>
        <span className="ops-list-name" style={{ display: 'block', whiteSpace: 'normal' }}>{asked}</span>
        {r.note && (
          <p style={{ margin: '2px 0 4px', fontSize: 13, lineHeight: 1.5, color: 'var(--grey-70)', overflowWrap: 'anywhere' }}>
            “{r.note}”
          </p>
        )}
        <p className="ops-audit">
          Asked by {r.requestedBy || <Awaiting label="name not recorded" />}
          {' · '}
          {formatWhen(r.requestedAt) ?? <Awaiting label="time not recorded" />}
        </p>
      </div>

      {mode === 'idle' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button" className="btn btn-primary btn-sm"
            onClick={() => { setMode('approve'); setError(null); }}
            aria-label={`Approve request for ${asked}`}
          >
            Approve
          </button>
          <button
            type="button" className="btn btn-secondary btn-sm"
            onClick={() => { setMode('decline'); setError(null); }}
            aria-label={`Decline request for ${asked}`}
          >
            Decline
          </button>
        </div>
      )}

      {mode === 'approve' && (
        <form
          aria-label={`Approve ${asked}`}
          onSubmit={e => { e.preventDefault(); void approve(); }}
          style={FORM}
        >
          <p style={HELP}>
            Correct the spelling to how the shop writes it — staff will pick exactly what you
            approve, and the product page groups sizes and colours by it.
          </p>
          <div style={FIELDS}>
            <Field id={`${ids}-brand`} label="Brand">
              <input
                id={`${ids}-brand`} className="input" value={brand} maxLength={60}
                list={`${ids}-brands`} autoComplete="off"
                onChange={e => setBrand(e.target.value)}
              />
              <BrandOptions id={`${ids}-brands`} models={catalogue ?? []} />
            </Field>
            <Field id={`${ids}-model`} label="Model" problem={problem}>
              <input
                id={`${ids}-model`} className={problem ? 'input input-error' : 'input'} value={model}
                maxLength={80} autoComplete="off" aria-invalid={problem ? true : undefined}
                aria-describedby={problem ? `${ids}-model-problem` : undefined}
                onChange={e => setModel(e.target.value)}
              />
            </Field>
          </div>
          {catalogue && brand.trim() && filedBrand !== brand.trim() && (
            <p style={HELP}>Filed under “{filedBrand}”, as the catalogue spells it.</p>
          )}
          {match && !problem && (
            <p style={HELP} role="status">
              {match.retiredAt
                ? <>{match.brand} {match.model} is already in the catalogue but retired. Approving brings it back into the picker and closes this request against it.</>
                : <>{match.brand} {match.model} is already in the catalogue. Approving closes this request against that entry — nothing new is added.</>}
            </p>
          )}
          {!catalogue && (
            <p style={HELP}>
              {/* Approving against a catalogue this page never read could rename
                  an existing entry to the request's spelling, because the
                  entry's id comes from the name. */}
              The catalogue could not be read, so there is no way to check this against what is
              already there. Refresh before approving.
            </p>
          )}
          {error && <InlineError text={error} />}
          <div style={ACTIONS}>
            <button
              type="submit" className="btn btn-primary btn-sm"
              disabled={!catalogue || !brand.trim() || !model.trim() || !!problem || working}
            >
              {working && <Loader2 size={14} className="admin-spin" />}
              {match ? 'Approve against existing entry' : 'Add to catalogue and approve'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMode('idle')}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === 'decline' && (
        <form
          aria-label={`Decline ${asked}`}
          onSubmit={e => { e.preventDefault(); if (reason.trim()) void decline(); }}
          style={FORM}
        >
          <Field id={`${ids}-reason`} label="Reason">
            <textarea
              id={`${ids}-reason`} className="input" rows={3} maxLength={500} value={reason}
              style={{ height: 'auto', padding: '10px 14px', lineHeight: 1.5 }}
              aria-describedby={`${ids}-reason-hint`}
              onChange={e => setReason(e.target.value)}
            />
          </Field>
          <p id={`${ids}-reason-hint`} style={HELP}>
            {r.requestedBy || 'Whoever asked'} will see this next to their request. Tell them what
            to do instead — which model to pick, or what to check on the phone.
          </p>
          {error && <InlineError text={error} />}
          <div style={ACTIONS}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={!reason.trim() || working}>
              {working && <Loader2 size={14} className="admin-spin" />}
              Send decline
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMode('idle')}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

/**
 * What happened to each request already answered. Collapsed, because it is
 * only opened when someone asks "what happened to my request?" — and then it
 * has to have the answer, including the reason a decline was given.
 */
function DecidedHistory({ history, catalogue }: { history: Read<ModelRequest[]>; catalogue: CatalogueModel[] }) {
  if (history.state === 'loading') return null;
  const decided = history.state === 'ok'
    ? [...history.value].sort((a, b) =>
      String(b.decidedAt ?? b.requestedAt ?? '').localeCompare(String(a.decidedAt ?? a.requestedAt ?? '')))
    : [];

  return (
    <details style={{ marginTop: 14, borderTop: '1px solid var(--grey-10)', paddingTop: 6 }}>
      <summary style={SUMMARY}>
        Decided{history.state === 'ok' ? ` (${decided.length})` : ''}
      </summary>
      {history.state === 'failed' ? (
        <LoadFailed>
          Past requests could not be read, so this cannot say what happened to one. {history.error}
        </LoadFailed>
      ) : decided.length === 0 ? (
        <p className="ops-footnote" style={{ borderTop: 0 }}>No request has been decided yet.</p>
      ) : (
        <ul className="ops-list">
          {decided.map(r => {
            const entry = r.catalogueModelId ? catalogue.find(m => m.id === r.catalogueModelId) : undefined;
            const respelt = entry && `${entry.brand} ${entry.model}` !== `${r.brand} ${r.model}`;
            return (
              <li key={r.id} className="ops-list-row" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0, flex: '1 1 14rem' }}>
                  <span className="ops-list-name" style={{ display: 'block', whiteSpace: 'normal' }}>
                    {r.brand} {r.model}
                  </span>
                  {r.status === 'approved' && respelt && (
                    <p style={HELP}>Added as {entry!.brand} {entry!.model}.</p>
                  )}
                  {r.status === 'declined' && (
                    <p style={{ ...HELP, color: 'var(--grey-70)', overflowWrap: 'anywhere' }}>
                      {r.reason ? `“${r.reason}”` : <Awaiting label="no reason recorded" />}
                    </p>
                  )}
                  <p className="ops-audit">
                    Asked by {r.requestedBy || '—'}
                    {formatWhen(r.requestedAt) ? ` · ${formatWhen(r.requestedAt)}` : ''}
                    {' · '}{r.status === 'approved' ? 'approved' : 'declined'} by {r.decidedBy || '—'}
                    {formatWhen(r.decidedAt) ? ` · ${formatWhen(r.decidedAt)}` : ''}
                  </p>
                </div>
                <span className={r.status === 'approved' ? 'ops-chip ops-chip-stock' : 'ops-chip ops-chip-returns'}>
                  {r.status === 'approved' ? 'Approved' : 'Declined'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}

// ── Models ─────────────────────────────────────────────────────

function ModelsSection({
  catalogue, usage, listingsFailed, truncated, busy, notice, onRetire, onRestore, onAdd,
}: {
  catalogue: Read<CatalogueModel[]>;
  usage: Map<string, Usage> | null;
  listingsFailed: boolean;
  truncated: boolean;
  busy: string | null;
  notice: string | null;
  onRetire: (m: CatalogueModel) => Outcome;
  onRestore: (m: CatalogueModel) => Outcome;
  onAdd: (brand: string, model: string, existing: CatalogueModel[]) => Outcome;
}) {
  const groups = useMemo(() => {
    if (catalogue.state !== 'ok') return [];
    const byBrand = new Map<string, CatalogueModel[]>();
    for (const m of catalogue.value) byBrand.set(m.brand, [...(byBrand.get(m.brand) ?? []), m]);
    return [...byBrand.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([brand, ms]) => ({
        brand,
        models: [...ms].sort((a, b) => a.model.localeCompare(b.model, undefined, { numeric: true })),
      }));
  }, [catalogue]);

  const live = catalogue.state === 'ok' ? catalogue.value.filter(m => !m.retiredAt).length : null;

  return (
    <Panel
      title="Models"
      question="What can staff pick when they list a phone? Retire what the shop no longer takes in — nothing is ever deleted, because listings point at it."
      hint={live === null ? undefined : `${live} pickable`}
      footnote={truncated
        ? `This shop has more listings than one read carries, so the listing counts describe the first ${INVENTORY_READ_CAP.toLocaleString('en-GB')} rather than all of them.`
        : undefined}
    >
      {notice && <Notice text={notice} />}
      {catalogue.state === 'loading' ? (
        <Skeleton rows={4} />
      ) : catalogue.state === 'failed' ? (
        <LoadFailed>
          The catalogue could not be read, so this is not an empty catalogue — it is an unknown
          one. {catalogue.error} Refresh to try again.
        </LoadFailed>
      ) : groups.length === 0 ? (
        <Empty
          icon={<Library size={26} />}
          text="No models yet. Import the ones your listings already use, or add one below."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.map(g => (
            <section key={g.brand} aria-label={g.brand}>
              <h3 className="ops-eyebrow" style={{ marginBottom: 2 }}>
                {g.brand} · {g.models.length} model{g.models.length === 1 ? '' : 's'}
              </h3>
              <ul className="ops-list">
                {g.models.map(m => (
                  <ModelRow
                    key={m.id} model={m} usage={usage?.get(m.id) ?? null}
                    listingsFailed={listingsFailed} busy={busy}
                    onRetire={onRetire} onRestore={onRestore}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {catalogue.state === 'ok' && (
        <AddModelForm catalogue={catalogue.value} busy={busy === 'add'} onAdd={onAdd} />
      )}
    </Panel>
  );
}

function ModelRow({
  model: m, usage, listingsFailed, busy, onRetire, onRestore,
}: {
  model: CatalogueModel;
  usage: Usage | null;
  listingsFailed: boolean;
  busy: string | null;
  onRetire: (m: CatalogueModel) => Outcome;
  onRestore: (m: CatalogueModel) => Outcome;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = `${m.brand} ${m.model}`;
  const working = busy === `retire:${m.id}` || busy === `restore:${m.id}`;
  const liveListings = usage?.live ?? 0;

  return (
    <li className={m.retiredAt ? 'ops-list-row ops-row-archived' : 'ops-list-row'} style={{ flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0, flex: '1 1 10rem' }}>
        <span className="ops-list-name" style={{ display: 'block' }}>{m.model}</span>
        <span className="ops-meta">
          {listingsFailed || !usage ? <Awaiting label="listings not counted" /> : describeUsage(usage)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {m.retiredAt && <span className="ops-chip">Retired</span>}
        {m.retiredAt ? (
          <button
            type="button" className="btn btn-secondary btn-sm" disabled={working}
            aria-label={`Restore ${name}`}
            onClick={async () => { setError(await onRestore(m)); }}
          >
            {working && <Loader2 size={14} className="admin-spin" />} Restore
          </button>
        ) : !confirming && (
          <button
            type="button" className="btn btn-secondary btn-sm"
            aria-label={`Retire ${name}`}
            onClick={() => { setConfirming(true); setError(null); }}
          >
            Retire
          </button>
        )}
      </div>

      {confirming && !m.retiredAt && (
        <div role="group" aria-label={`Confirm retiring ${name}`} style={{ ...FORM, flexBasis: '100%' }}>
          <p style={{ ...HELP, color: 'var(--black)' }}>
            Retire {name}? New listings can't choose it; existing listings keep it.
          </p>
          {listingsFailed || !usage ? (
            <p style={HELP}>
              The listings could not be counted, so this cannot say how many use it. Retiring is
              still safe — nothing on sale changes.
            </p>
          ) : liveListings > 0 && (
            <p style={{ ...HELP, color: '#92400e' }}>
              <AlertTriangle size={12} style={{ verticalAlign: '-1px' }} />{' '}
              {liveListings} live listing{liveListings === 1 ? '' : 's'} still use{liveListings === 1 ? 's' : ''} it.
              They stay on sale with this model; only new listings lose it. If the shop still takes
              this phone in, leave it.
            </p>
          )}
          {error && <InlineError text={error} />}
          <div style={ACTIONS}>
            <button
              type="button" className="btn btn-primary btn-sm" disabled={working}
              onClick={async () => {
                const failed = await onRetire(m);
                setError(failed);
                if (!failed) setConfirming(false);
              }}
            >
              {working && <Loader2 size={14} className="admin-spin" />} Yes, retire it
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirming(false)}>
              Keep it
            </button>
          </div>
        </div>
      )}
      {error && !confirming && <div style={{ flexBasis: '100%' }}><InlineError text={error} /></div>}
    </li>
  );
}

/**
 * Add a model by hand. A new brand is allowed here and nowhere else, because
 * this page is manager-only and a brand the shop has never carried is exactly
 * the kind of decision the catalogue exists to keep with a manager.
 */
function AddModelForm({
  catalogue, busy, onAdd,
}: {
  catalogue: CatalogueModel[];
  busy: boolean;
  onAdd: (brand: string, model: string, existing: CatalogueModel[]) => Outcome;
}) {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ids = useId();

  const filedBrand = catalogueBrand(catalogue, brand);
  const newBrand = brand.trim() !== '' && !catalogue.some(m => sameWords(m.brand, brand));
  const problem = model.trim() ? modelNameProblem(model) : null;
  const match = brand.trim() && model.trim() ? findCatalogueModel(catalogue, filedBrand, model) : undefined;

  const submit = async () => {
    setError(null);
    const failed = await onAdd(filedBrand, model.trim(), catalogue);
    setError(failed);
    if (!failed) { setModel(''); }
  };

  return (
    <form
      aria-label="Add a model"
      onSubmit={e => { e.preventDefault(); void submit(); }}
      style={{ ...FORM, marginTop: 16, borderTop: '1px solid var(--grey-10)', paddingTop: 14 }}
    >
      <h3 className="ops-panel-title" style={{ fontSize: 13 }}>Add a model</h3>
      <div style={FIELDS}>
        <Field id={`${ids}-brand`} label="Brand">
          <input
            id={`${ids}-brand`} className="input" value={brand} maxLength={60}
            list={`${ids}-brands`} autoComplete="off" placeholder="Choose, or type a new one"
            onChange={e => setBrand(e.target.value)}
          />
          <BrandOptions id={`${ids}-brands`} models={catalogue} />
        </Field>
        <Field id={`${ids}-model`} label="Model" problem={problem}>
          <input
            id={`${ids}-model`} className={problem ? 'input input-error' : 'input'} value={model}
            maxLength={80} autoComplete="off" placeholder="e.g. iPhone 17 Pro"
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? `${ids}-model-problem` : undefined}
            onChange={e => setModel(e.target.value)}
          />
        </Field>
      </div>
      {newBrand && (
        <p style={HELP}>
          {brand.trim()} is a new brand. Staff will see it in the picker as soon as this model is added.
        </p>
      )}
      {!newBrand && brand.trim() && filedBrand !== brand.trim() && (
        <p style={HELP}>Filed under “{filedBrand}”, as the catalogue spells it.</p>
      )}
      {match && !problem && (
        <p style={HELP} role="status">
          {match.retiredAt
            ? <>{match.brand} {match.model} is already here but retired. Adding it brings it back into the picker.</>
            : <>{match.brand} {match.model} is already in the catalogue — there is nothing to add.</>}
        </p>
      )}
      {error && <InlineError text={error} />}
      <div style={ACTIONS}>
        <button
          type="submit" className="btn btn-primary btn-sm"
          disabled={!brand.trim() || !model.trim() || !!problem || busy || (!!match && !match.retiredAt)}
        >
          {busy && <Loader2 size={14} className="admin-spin" />}
          {match?.retiredAt ? 'Bring it back' : 'Add model'}
        </button>
      </div>
    </form>
  );
}

// ── Import ─────────────────────────────────────────────────────

function ImportSection({
  catalogue, listings, plan, busy, notice, onImport,
}: {
  catalogue: Read<CatalogueModel[]>;
  listings: Read<{ products: Product[]; truncated: boolean }>;
  plan: ImportPlan | null;
  busy: string | null;
  notice: string | null;
  onImport: (plan: ImportPlan) => Outcome;
}) {
  const [error, setError] = useState<string | null>(null);
  const title = 'Import from existing listings';
  const question = 'Which phones does the shop already sell that the catalogue does not know about yet?';

  if (catalogue.state === 'loading' || listings.state === 'loading') {
    return <Panel title={title} question={question}><Skeleton rows={3} /></Panel>;
  }
  if (catalogue.state === 'failed' || listings.state === 'failed') {
    return (
      <Panel title={title} question={question}>
        <LoadFailed>
          {listings.state === 'failed'
            ? `The listings could not be read, so there is nothing to compare the catalogue against. ${listings.error}`
            : 'The catalogue could not be read, so there is no telling which models it already has.'}{' '}
          Refresh to try again.
        </LoadFailed>
      </Panel>
    );
  }

  const { products, truncated } = listings.value;
  const p = plan!;

  // Nothing left to do is one quiet line, not a panel: a finished job that
  // keeps its full-size box keeps asking to be looked at.
  if (p.toAdd.length === 0 && p.refused.length === 0) {
    return (
      <div>
        {notice && <Notice text={notice} />}
        <p className="ops-audit">
          {products.length === 0
            ? 'Import: there are no listings yet, so nothing to import from.'
            : 'Import: every model on an existing listing is already in the catalogue.'}
        </p>
      </div>
    );
  }

  const covered = p.toAdd.reduce((n, e) => n + e.listings, 0);

  return (
    <Panel
      title={title}
      question={question}
      hint={`${p.toAdd.length} to add`}
      footnote={truncated
        ? `This shop has more listings than one read carries, so this plan covers the first ${INVENTORY_READ_CAP.toLocaleString('en-GB')}. A model that appears only on listings beyond that is not in it.`
        : 'Nothing is written until you press Import. Running it twice is harmless — the second run finds everything already there.'}
    >
      {notice && <Notice text={notice} />}

      {p.toAdd.length > 0 && (
        <details open={p.toAdd.length <= 12}>
          <summary style={SUMMARY}>
            {p.toAdd.length} model{p.toAdd.length === 1 ? '' : 's'} would be added, covering{' '}
            {covered} listing{covered === 1 ? '' : 's'}
          </summary>
          <ul className="ops-list">
            {p.toAdd.map(e => (
              <li key={e.id} className="ops-list-row">
                <span className="ops-list-name" style={{ minWidth: 0 }}>{e.brand} {e.model}</span>
                <span className="ops-meta" style={{ flexShrink: 0 }}>
                  {e.listings} listing{e.listings === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {p.spellings.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <h3 className="ops-panel-title" style={{ fontSize: 13 }}>One model, several spellings</h3>
          <p style={HELP}>
            The commonest spelling wins. Listings spelt another way keep their spelling for now, and
            are corrected to the winner the next time someone saves them.
          </p>
          <ul className="ops-list">
            {p.spellings.map(s => (
              <li key={s.chosen} className="ops-list-row" style={{ flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                <span style={{ fontSize: 13, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                  <strong>{s.chosen}</strong> wins over {s.others.map((o, i) => (
                    <React.Fragment key={o}>{i > 0 ? ', ' : ''}<span className="ops-chip">{o}</span></React.Fragment>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.refused.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <h3 className="ops-panel-title" style={{ fontSize: 13 }}>Not imported — fix these listings by hand</h3>
          <p style={HELP}>
            These model names carry a storage size or a colour, so each is a phone of its own to the
            shop front and its page offers no other sizes or colours. Open each listing, move the size
            to Storage or the colour to Colour options, and pick the model from the catalogue.
          </p>
          <ul className="ops-list">
            {p.refused.map(r => {
              const key = modelKey(r.brand, r.model);
              const affected = products.filter(x => modelKey(x.brand ?? '', x.model ?? '') === key);
              return (
                <li key={key} className="ops-list-row" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0, flex: '1 1 14rem' }}>
                    <span className="ops-list-name" style={{ display: 'block', whiteSpace: 'normal' }}>
                      {r.brand} {r.model}
                    </span>
                    <p style={HELP}>{r.problem}</p>
                    <p style={{ ...HELP, display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                      {affected.slice(0, 6).map(x => (
                        <Link
                          key={x.id} to={`/admin/inventory/${x.id}`}
                          style={{ display: 'inline-flex', alignItems: 'center', minHeight: 32, maxWidth: '100%', overflowWrap: 'anywhere' }}
                        >
                          Edit {x.id}
                        </Link>
                      ))}
                      {affected.length > 6 && <span style={{ alignSelf: 'center' }}>and {affected.length - 6} more</span>}
                    </p>
                  </div>
                  <span className="ops-meta" style={{ flexShrink: 0 }}>
                    {r.listings} listing{r.listings === 1 ? '' : 's'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && <InlineError text={error} />}
      {p.toAdd.length > 0 && (
        <div style={{ ...ACTIONS, marginTop: 14 }}>
          <button
            type="button" className="btn btn-buy btn-md" disabled={busy === 'import'}
            onClick={async () => { setError(null); setError(await onImport(p)); }}
          >
            {busy === 'import' && <Loader2 size={16} className="admin-spin" />}
            Import {p.toAdd.length} model{p.toAdd.length === 1 ? '' : 's'}
          </button>
        </div>
      )}
    </Panel>
  );
}

// ── Pieces ─────────────────────────────────────────────────────
// Panel, Empty, LoadFailed, Skeleton and Awaiting follow DashboardPage's, so
// the two pages draw "nothing to do" and "could not be read" identically.

function Panel({
  title, question, hint, footnote, children,
}: {
  title: string;
  question: string;
  hint?: string;
  footnote?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section className="ops-panel ops-panel-stock" aria-labelledby={id}>
      <div className="ops-panel-head">
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <h2 id={id} className="ops-panel-title">{title}</h2>
          <p className="ops-question">{question}</p>
        </div>
        {hint ? <span className="ops-meta">{hint}</span> : null}
      </div>
      {children}
      {footnote ? <p className="ops-footnote">{footnote}</p> : null}
    </section>
  );
}

function Field({
  id, label, problem, children,
}: {
  id: string; label: string; problem?: string | null; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: '1 1 12rem' }}>
      <label htmlFor={id} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--grey-70)' }}>{label}</label>
      {children}
      {problem && (
        <span id={`${id}-problem`} style={{ ...HELP, color: '#991b1b' }}>
          <AlertTriangle size={12} style={{ verticalAlign: '-1px' }} /> {problem}
        </span>
      )}
    </div>
  );
}

/** Every brand on file, retired ones included, so a returning brand is chosen rather than retyped. */
function BrandOptions({ id, models }: { id: string; models: CatalogueModel[] }) {
  const brands = [...new Set(models.map(m => m.brand))].sort((a, b) => a.localeCompare(b));
  return (
    <datalist id={id}>
      {brands.map(b => <option key={b} value={b} />)}
    </datalist>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <p role="status" style={{ ...HELP, display: 'flex', gap: 6, alignItems: 'flex-start', color: 'var(--ops-owner-stock)', margin: '0 0 10px' }}>
      <Check size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {text}
    </p>
  );
}

function InlineError({ text }: { text: string }) {
  return (
    <div role="alert" className="ops-alert" style={{ padding: '8px 10px', fontSize: 13 }}>
      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{text}</span>
    </div>
  );
}

function Awaiting({ label = 'Awaiting' }: { label?: string }) {
  return <span className="ops-awaiting">{label}</span>;
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-live="polite" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} className="ops-skel" style={{ height: 16, width: `${92 - i * 9}%` }} />
      ))}
    </div>
  );
}

/** Nothing to do. The calm one. */
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="ops-empty">
      <span style={{ color: 'var(--grey-30)' }}>{icon}</span>
      <p style={{ margin: 0, maxWidth: '46ch' }}>{text}</p>
    </div>
  );
}

/**
 * Nothing known. On this page the difference is a person: an empty queue
 * drawn over a failed read tells the manager nobody is waiting while someone
 * on the shop floor is holding a phone they cannot list.
 */
function LoadFailed({ children }: { children: React.ReactNode }) {
  return (
    <div className="ops-empty" role="status">
      <span style={{ color: 'var(--color-sale)' }}><FileWarning size={26} /></span>
      <span className="ops-chip">Could not load</span>
      <p style={{ margin: 0, maxWidth: '46ch' }}>{children}</p>
    </div>
  );
}

// ── Logic ──────────────────────────────────────────────────────

type Read<T> =
  | { state: 'loading' }
  | { state: 'failed'; error: string }
  | { state: 'ok'; value: T };

const LOADING = { state: 'loading' } as const;

type Where = 'requests' | 'models' | 'import';

function settled<T, U = T>(r: PromiseSettledResult<T>, map?: (v: T) => U): Read<U> {
  return r.status === 'fulfilled'
    ? { state: 'ok', value: map ? map(r.value) : (r.value as unknown as U) }
    : { state: 'failed', error: describeError(r.reason) };
}

interface Usage { live: number; archived: number }

/**
 * How many listings sit on each model.
 *
 * By the id a listing carries when there is one, and by name otherwise:
 * every listing written before the catalogue existed has no id, and counting
 * only by id would show the models the shop sells most as used by nobody —
 * which is exactly when a manager would retire one.
 */
function usageByModel(models: readonly CatalogueModel[], products: readonly Product[]): Map<string, Usage> {
  const byId = new Map(models.map(m => [m.id, m]));
  const byKey = new Map(models.map(m => [modelKey(m.brand, m.model), m]));
  const out = new Map<string, Usage>(models.map(m => [m.id, { live: 0, archived: 0 }]));
  for (const p of products) {
    const m = (p.catalogueModelId && byId.get(p.catalogueModelId))
      || byKey.get(modelKey(p.brand ?? '', p.model ?? ''));
    if (!m) continue;
    const u = out.get(m.id)!;
    if (p.archivedAt) u.archived++; else u.live++;
  }
  return out;
}

function describeUsage(u: Usage): string {
  if (u.live === 0 && u.archived === 0) return 'No listings';
  const live = `${u.live} live listing${u.live === 1 ? '' : 's'}`;
  return u.archived ? `${live} · ${u.archived} archived` : live;
}

function sameWords(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  return norm(a) === norm(b);
}

/**
 * The catalogue's own spelling of a brand the manager typed.
 *
 * "apple" filed beside "Apple" would give the staff picker two Apples, each
 * holding half the phones, so a brand already on file is always written the
 * way it is already written.
 */
function catalogueBrand(models: readonly CatalogueModel[], typed: string): string {
  const hit = models.find(m => sameWords(m.brand, typed));
  return hit ? hit.brand : typed.trim().replace(/\s+/g, ' ');
}

function formatWhen(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Inline styles shared by the forms ──────────────────────────

const HELP: React.CSSProperties = {
  margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--grey-50)',
};
const FORM: React.CSSProperties = {
  flexBasis: '100%', display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0,
};
const FIELDS: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: 10,
};
const ACTIONS: React.CSSProperties = {
  display: 'flex', gap: 8, flexWrap: 'wrap',
};
// list-item rather than flex: a flex summary loses its disclosure triangle,
// and the triangle is the only sign the history is there to be opened.
// 20px of line plus 6px either side keeps the target at 32px.
const SUMMARY: React.CSSProperties = {
  display: 'list-item', padding: '6px 0', lineHeight: '20px', cursor: 'pointer',
  fontSize: 13, fontWeight: 700, color: 'var(--grey-70)',
};
