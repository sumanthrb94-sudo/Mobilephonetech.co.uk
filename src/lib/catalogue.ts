import {
  collection, doc, getDocs, query, serverTimestamp, updateDoc, where,
  writeBatch, limit as fsLimit, deleteField,
} from 'firebase/firestore';
import { auth, db, COL, withAdminRetry } from './firebase';
import { currentActor, slugify } from './adminApi';
import type { Product } from '../types';

/**
 * The models this shop sells, and the queue of requests for ones it does not.
 *
 * InventoryManager's intake rule is that employees pick a model from the admin
 * catalogue and only a manager sees the "Add …" pill. LeHart had the second
 * half and not the first: the "catalogue" was whatever had ever been typed
 * into a product, so one mistyped listing became a catalogue entry for good,
 * and a member of staff could still type a model nobody had approved and only
 * be refused at the moment they pressed Save.
 *
 * Now there is a real list. A manager maintains it; staff choose from it and
 * cannot type a model at all. When the model they need is missing, they ask
 * for it, and the request waits in front of a manager until it is approved —
 * which adds the model — or declined with a reason. The request is the task.
 *
 * WHERE THE RULE LIVES
 *
 * The picker is what staff see, but firestore.rules is what holds: a staff
 * listing whose brand and model are not a live entry, spelt exactly as the
 * entry spells them, is refused by the database. A browser that skips the
 * picker gets a permission error rather than a new model.
 *
 * WHY GROUPING DEPENDS ON THIS
 *
 * The product page offers the other sizes and colours of a phone by grouping
 * listings on brand and model (src/lib/productSiblings.ts). "iPhone 8" and
 * "iPhone 8 128GB" are two different phones to that code, so a listing with
 * the storage typed into its model field is an orphan: its page offers no
 * other sizes, and nothing says why. A model that can only be picked cannot
 * be typed wrong.
 */

/** One model the shop may list. */
export interface CatalogueModel {
  id: string;
  brand: string;
  model: string;
  createdBy?: string;
  /**
   * When it was withdrawn from the picker. Entries are never deleted —
   * listings already point at them — so a wrong or discontinued model is
   * retired instead: existing listings keep it, new ones cannot choose it.
   */
  retiredAt?: string;
}

export type ModelRequestStatus = 'open' | 'approved' | 'declined';

/** A member of staff asking for a model the catalogue lacks. */
export interface ModelRequest {
  id: string;
  brand: string;
  model: string;
  /** Why they need it — the listing they were trying to make, usually. */
  note?: string;
  status: ModelRequestStatus;
  requestedBy: string;
  requestedAt?: string;
  decidedBy?: string;
  decidedAt?: string;
  /** Said to the requester when a request is declined. */
  reason?: string;
  /** The entry an approved request created, as the manager spelt it. */
  catalogueModelId?: string;
}

// ── Pure helpers ────────────────────────────────────────────────

/**
 * The same model, ignoring case and spacing.
 *
 * Matches the grouping key in productSiblings.ts on purpose: two spellings
 * this treats as one are two spellings the product page would also have
 * treated as one, so nothing is merged here that the shop front keeps apart.
 */
export function modelKey(brand: string, model: string): string {
  return `${brand}|${model}`.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * The document id for a brand and model.
 *
 * Deterministic, so adding the same model twice lands on the same document
 * rather than creating a duplicate, and a request approved twice cannot make
 * two entries. The double underscore keeps brand and model apart: "Apple" +
 * "iPhone 8" and "Apple iPhone" + "8" would otherwise both be apple-iphone-8.
 */
export function catalogueModelId(brand: string, model: string): string {
  return `${slugify(brand)}__${slugify(model)}`;
}

/** The entry for a brand and model, however the caller spelt it. */
export function findCatalogueModel(
  models: readonly CatalogueModel[], brand: string, model: string,
): CatalogueModel | undefined {
  const key = modelKey(brand, model);
  return models.find(m => modelKey(m.brand, m.model) === key);
}

/** Entries a new listing may choose: live ones only. */
export function pickable(models: readonly CatalogueModel[]): CatalogueModel[] {
  return models.filter(m => !m.retiredAt);
}

/** Brands with at least one pickable model, alphabetically. */
export function brandsOf(models: readonly CatalogueModel[]): string[] {
  return [...new Set(pickable(models).map(m => m.brand))].sort((a, b) => a.localeCompare(b));
}

/** Pickable models under one brand, alphabetically. */
export function modelsFor(models: readonly CatalogueModel[], brand: string): CatalogueModel[] {
  const b = brand.trim().toLowerCase();
  return pickable(models)
    .filter(m => m.brand.toLowerCase() === b)
    .sort((a, c) => a.model.localeCompare(c.model, undefined, { numeric: true }));
}

/**
 * Words that belong in another field.
 *
 * The one mistake that breaks grouping silently is putting the storage or the
 * colour into the model name. A manager adding "iPhone 8 128GB" creates a
 * model no other iPhone 8 listing will ever sit beside. So the catalogue
 * refuses a model name carrying a capacity, and says which field it belongs
 * in, rather than accepting it and leaving the shop front to fail quietly.
 *
 * Colours are checked against a short list of words that are almost never
 * part of a phone's own name. "Pixel 8 Pro" is a model; "Pixel 8 Obsidian"
 * is a model and a colour.
 */
const CAPACITY = /\b\d+(\.\d+)?\s?(gb|tb|mb)\b/i;
const COLOUR_WORDS = [
  'black', 'white', 'silver', 'gold', 'graphite', 'midnight', 'starlight',
  'blue', 'red', 'green', 'purple', 'pink', 'yellow', 'grey', 'gray',
  'obsidian', 'porcelain', 'hazel', 'titanium', 'lavender', 'cream',
];

export function modelNameProblem(model: string): string | null {
  const m = model.trim();
  if (!m) return 'Required.';
  if (CAPACITY.test(m)) {
    return 'Storage belongs in the Storage field, not the model name — otherwise this becomes a separate phone that no other size of it is grouped with.';
  }
  const colour = COLOUR_WORDS.find(c => new RegExp(`\\b${c}\\b`, 'i').test(m));
  if (colour) {
    return `"${colour}" looks like a colour. Colours belong in Colour options, not the model name — otherwise this becomes a separate phone that no other colour of it is grouped with.`;
  }
  if (m.length > 80) return 'Keep it under 80 characters.';
  return null;
}

/**
 * What importing the existing listings would add.
 *
 * The catalogue starts empty, but the shop does not: every model already on
 * a listing has to become an entry, or on the day the rules go live staff
 * cannot create a listing for a phone the shop has sold for months.
 *
 * Where listings disagree on the spelling of one model, the commonest
 * spelling wins and the rest are reported, because those listings will be
 * corrected to it the next time someone saves them. The manager should see
 * that before it happens rather than discover it afterwards.
 *
 * A model name that would be refused by modelNameProblem is reported rather
 * than imported: importing "iPhone 8 128GB" would put the orphan the
 * catalogue exists to prevent straight into it.
 */
export interface ImportPlan {
  toAdd: Array<{ id: string; brand: string; model: string; listings: number }>;
  alreadyPresent: number;
  /** One model spelt more than one way across listings. */
  spellings: Array<{ chosen: string; others: string[] }>;
  /** Listings whose model name carries a storage size or a colour. */
  refused: Array<{ brand: string; model: string; problem: string; listings: number }>;
}

export function planImport(
  products: ReadonlyArray<Pick<Product, 'brand' | 'model'>>,
  existing: readonly CatalogueModel[],
): ImportPlan {
  const groups = new Map<string, Map<string, { brand: string; model: string; n: number }>>();

  for (const p of products) {
    const brand = p.brand?.trim();
    const model = p.model?.trim();
    if (!brand || !model) continue;
    const key = modelKey(brand, model);
    const spellings = groups.get(key) ?? new Map();
    const spelt = `${brand}|${model}`;
    const seen = spellings.get(spelt) ?? { brand, model, n: 0 };
    seen.n++;
    spellings.set(spelt, seen);
    groups.set(key, spellings);
  }

  const plan: ImportPlan = { toAdd: [], alreadyPresent: 0, spellings: [], refused: [] };

  for (const [, spellings] of groups) {
    const ranked = [...spellings.values()].sort((a, b) => b.n - a.n || a.model.localeCompare(b.model));
    const top = ranked[0];
    const listings = ranked.reduce((n, s) => n + s.n, 0);

    if (findCatalogueModel(existing, top.brand, top.model)) {
      plan.alreadyPresent++;
      continue;
    }

    const problem = modelNameProblem(top.model);
    if (problem) {
      plan.refused.push({ brand: top.brand, model: top.model, problem, listings });
      continue;
    }

    plan.toAdd.push({ id: catalogueModelId(top.brand, top.model), brand: top.brand, model: top.model, listings });
    if (ranked.length > 1) {
      plan.spellings.push({
        chosen: `${top.brand} ${top.model}`,
        others: ranked.slice(1).map(s => `${s.brand} ${s.model}`),
      });
    }
  }

  plan.toAdd.sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model, undefined, { numeric: true }));
  return plan;
}

// ── Reads ───────────────────────────────────────────────────────

function toModel(id: string, d: Record<string, unknown>): CatalogueModel {
  return {
    id,
    brand: String(d.brand ?? ''),
    model: String(d.model ?? ''),
    createdBy: (d.createdBy as string) ?? undefined,
    retiredAt: (d.retiredAt as string) ?? undefined,
  };
}

/** Every entry, retired ones included — the manager's page needs them. */
export async function listCatalogueModels(): Promise<CatalogueModel[]> {
  const snap = await getDocs(query(collection(db, COL.catalogueModels), fsLimit(2000)));
  return snap.docs
    .map(d => toModel(d.id, d.data()))
    .sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model, undefined, { numeric: true }));
}

function isoOf(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  const toDate = (v as { toDate?: () => Date } | null)?.toDate;
  return typeof toDate === 'function' ? toDate.call(v).toISOString() : undefined;
}

/** Requests, newest first. Pass a status to see only that queue. */
export async function listModelRequests(status?: ModelRequestStatus): Promise<ModelRequest[]> {
  const base = collection(db, COL.modelRequests);
  const snap = await getDocs(status
    ? query(base, where('status', '==', status), fsLimit(500))
    : query(base, fsLimit(500)));
  return snap.docs
    .map(d => {
      const r = d.data();
      return {
        id: d.id,
        brand: String(r.brand ?? ''),
        model: String(r.model ?? ''),
        note: (r.note as string) || undefined,
        status: (r.status as ModelRequestStatus) ?? 'open',
        requestedBy: String(r.requestedBy ?? ''),
        requestedAt: isoOf(r.requestedAt),
        decidedBy: (r.decidedBy as string) || undefined,
        decidedAt: isoOf(r.decidedAt),
        reason: (r.reason as string) || undefined,
        catalogueModelId: (r.catalogueModelId as string) || undefined,
      };
    })
    .sort((a, b) => String(b.requestedAt ?? '').localeCompare(String(a.requestedAt ?? '')));
}

// ── Writes ──────────────────────────────────────────────────────

export class CatalogueError extends Error {}

/**
 * Add a model. Manager only — firestore.rules refuses anyone else.
 *
 * Returns the entry that now exists, which may be one that was already
 * there: adding a model twice is not an error, it is the model.
 */
export async function addCatalogueModel(
  brand: string, model: string, existing: readonly CatalogueModel[] = [],
): Promise<CatalogueModel> {
  const b = brand.trim();
  const m = model.trim();
  if (!b) throw new CatalogueError('Brand is required.');
  const problem = modelNameProblem(m);
  if (problem) throw new CatalogueError(problem);

  const already = findCatalogueModel(existing, b, m);
  if (already && !already.retiredAt) return already;

  const id = already?.id ?? catalogueModelId(b, m);
  const batch = writeBatch(db);
  batch.set(doc(db, COL.catalogueModels, id), {
    brand: already?.brand ?? b,
    model: already?.model ?? m,
    // Re-adding a retired model brings it back rather than making a twin,
    // and keeps whoever first added it: that is the provenance worth having.
    ...(already
      ? { retiredAt: deleteField(), retiredBy: deleteField(), restoredBy: currentActor() }
      : { createdBy: currentActor(), createdAt: serverTimestamp() }),
  }, { merge: true });
  await withAdminRetry(() => batch.commit());
  return { id, brand: already?.brand ?? b, model: already?.model ?? m, createdBy: currentActor() };
}

/** Withdraw a model from the picker. Listings already using it keep it. */
export async function retireCatalogueModel(id: string): Promise<void> {
  await withAdminRetry(() => updateDoc(doc(db, COL.catalogueModels, id), {
    retiredAt: new Date().toISOString(),
    retiredBy: currentActor(),
  }));
}

/** Put a retired model back in the picker. */
export async function restoreCatalogueModel(id: string): Promise<void> {
  await withAdminRetry(() => updateDoc(doc(db, COL.catalogueModels, id), {
    retiredAt: deleteField(),
    retiredBy: deleteField(),
  }));
}

/**
 * Ask a manager for a model the catalogue lacks. Any member of staff.
 *
 * Refuses a request for a model that is already there — the answer to that
 * is to pick it — and returns the existing open request rather than filing a
 * duplicate, so three people needing the same phone on the same morning
 * produce one task, not three.
 */
export async function requestModel(
  input: { brand: string; model: string; note?: string },
  context: { catalogue: readonly CatalogueModel[]; open: readonly ModelRequest[] },
): Promise<ModelRequest> {
  const brand = input.brand.trim();
  const model = input.model.trim();
  if (!brand) throw new CatalogueError('Say which brand.');
  const problem = modelNameProblem(model);
  if (problem) throw new CatalogueError(problem);

  const present = findCatalogueModel(context.catalogue, brand, model);
  if (present && !present.retiredAt) {
    throw new CatalogueError(`${present.brand} ${present.model} is already in the catalogue — pick it from the list.`);
  }

  const key = modelKey(brand, model);
  const duplicate = context.open.find(r => r.status === 'open' && modelKey(r.brand, r.model) === key);
  if (duplicate) return duplicate;

  const uid = auth.currentUser?.uid;
  if (!uid) throw new CatalogueError('Sign in again — the session has expired.');

  const ref = doc(collection(db, COL.modelRequests));
  const note = input.note?.trim().slice(0, 500) || null;
  const batch = writeBatch(db);
  batch.set(ref, {
    brand: brand.slice(0, 60),
    model: model.slice(0, 80),
    note,
    status: 'open',
    requestedBy: currentActor(),
    requestedByUid: uid,
    requestedAt: serverTimestamp(),
  });
  await withAdminRetry(() => batch.commit());
  return { id: ref.id, brand, model, note: note ?? undefined, status: 'open', requestedBy: currentActor() };
}

/**
 * Approve a request: add the model and close the request together.
 *
 * One batch, so there is never a request marked approved for a model that
 * failed to land, nor a model that landed under a request still sitting in
 * the queue for someone else to act on again. The manager may correct the
 * spelling on the way through — the request is what someone typed, the
 * catalogue is what the shop calls it.
 */
export async function approveModelRequest(
  request: ModelRequest,
  spelling: { brand: string; model: string },
  existing: readonly CatalogueModel[],
): Promise<CatalogueModel> {
  const brand = spelling.brand.trim();
  const model = spelling.model.trim();
  if (!brand) throw new CatalogueError('Brand is required.');
  const problem = modelNameProblem(model);
  if (problem) throw new CatalogueError(problem);

  const already = findCatalogueModel(existing, brand, model);
  const id = already?.id ?? catalogueModelId(brand, model);
  const entry = { brand: already?.brand ?? brand, model: already?.model ?? model };

  const batch = writeBatch(db);
  batch.set(doc(db, COL.catalogueModels, id), {
    ...entry,
    // When the corrected spelling turns out to be a model already in the
    // catalogue, approving closes the request against it without rewriting
    // who added it or when.
    ...(already
      ? (already.retiredAt ? { retiredAt: deleteField(), retiredBy: deleteField(), restoredBy: currentActor() } : {})
      : { createdBy: currentActor(), createdAt: serverTimestamp(), requestId: request.id }),
  }, { merge: true });
  batch.update(doc(db, COL.modelRequests, request.id), {
    status: 'approved',
    decidedBy: currentActor(),
    decidedAt: serverTimestamp(),
    catalogueModelId: id,
  });
  await withAdminRetry(() => batch.commit());
  return { id, ...entry };
}

/**
 * Decline a request. A reason is required: a refusal that only says "no"
 * sends the requester to ask a colleague what happened.
 */
export async function declineModelRequest(request: ModelRequest, reason: string): Promise<void> {
  const why = reason.trim();
  if (!why) throw new CatalogueError('Say why, so whoever asked knows what to do instead.');
  await withAdminRetry(() => updateDoc(doc(db, COL.modelRequests, request.id), {
    status: 'declined',
    decidedBy: currentActor(),
    decidedAt: serverTimestamp(),
    reason: why.slice(0, 500),
  }));
}

/**
 * Write an import plan. Manager only.
 *
 * Batched in chunks well under Firestore's 500-write limit. Deterministic
 * ids make it safe to run twice: a second run finds everything present.
 */
export async function applyImport(plan: ImportPlan): Promise<number> {
  const CHUNK = 400;
  let written = 0;
  for (let i = 0; i < plan.toAdd.length; i += CHUNK) {
    const batch = writeBatch(db);
    for (const e of plan.toAdd.slice(i, i + CHUNK)) {
      batch.set(doc(db, COL.catalogueModels, e.id), {
        brand: e.brand,
        model: e.model,
        createdBy: currentActor(),
        createdAt: serverTimestamp(),
        importedFromListings: e.listings,
      }, { merge: true });
    }
    await withAdminRetry(() => batch.commit());
    written += Math.min(CHUNK, plan.toAdd.length - i);
  }
  return written;
}
