import type { Product } from '../types';
// The order book the console holds is `AdminOrder`. There is no `Order` in
// src/types.ts, and the checkout's `Order` is the customer's half of the same
// sale — it has no courier, no refund and no contact email, which are three of
// the things a shop owner opens an order export to look at. Aliased because
// these columns describe orders, not one screen's view model.
import type { AdminOrder as Order } from './orders';

/**
 * Taking the catalogue and the order book out of the building, as CSV.
 *
 * The shop is run from spreadsheets. Stock counts get reconciled in one, the
 * accountant is sent another, and both of those files have formulas in them
 * that were written once and are never looked at again. That fact decides
 * almost everything in this module.
 *
 * THE COLUMN CONTRACT
 *
 * Downstream formulas point at column letters, not at headers. `=SUM(H2:H999)`
 * is the stock total until someone inserts a column before H, at which point
 * it is the price total and nobody is told. So: a new column is appended to
 * the end of the list, and an existing one is never renamed, removed or
 * moved. src/__tests__/lib/adminExport.test.ts pins the order as a literal
 * array — that test failing is the contract speaking, not a stale fixture.
 *
 * AN EXPORT IS ALWAYS A VALID IMPORT
 *
 * The file handed to someone has to be one this system can read back, so
 * every cell is written to be parseable rather than pretty: numbers are plain
 * digits with no £ sign and no thousands separator, absent values are empty
 * cells rather than the word "undefined", and a header row is emitted even
 * when there are no rows at all.
 *
 * WHAT THIS MODULE IS NOT
 *
 * There is no CSV library here on purpose. RFC 4180 is about twenty lines of
 * quoting rules and the formula-injection defence below is not something a
 * general-purpose library does for you, so a dependency would buy the first
 * half of the job and hide the second.
 */

/** One column in an export. */
export interface Column<T> {
  /** The header text. Never change one — downstream formulas key on it. */
  header: string;
  /** How to read this column out of a row. Return '' for absent, never 'undefined'. */
  value: (row: T) => string;
}

/**
 * A cell holding text.
 *
 * `String(undefined)` is the string "undefined", and a column of those is how
 * a stock sheet ends up with a hundred rows claiming a phone's storage is
 * literally "undefined". An absent value is an empty cell.
 */
function text(value: string | null | undefined): string {
  return value == null ? '' : String(value);
}

/**
 * A cell holding money, in pounds.
 *
 * Two decimal places because this column is summed, and a spreadsheet that
 * adds 55 and 55.5 and shows 110.5 has an accountant asking why the pence are
 * missing. No £ sign: Excel reads "£55.00" as text and refuses to total it,
 * and the importer would have to strip it back off again.
 */
function money(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '';
}

/**
 * A cell holding a count.
 *
 * The finite check is not paranoia — stock arrives from Firestore where a
 * field can be missing or a string, and `Number(undefined)` is NaN. "NaN" in
 * the stock column reads as a real value to whoever opens the file.
 */
function count(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

/**
 * The inventory export.
 *
 * Identity, then money, then stock, then who last touched it. Not every field
 * on a Product is here — nobody reconciles stock against a display resolution
 * — but everything needed to answer "what do we have, what is it worth, and
 * who changed it" is.
 *
 * NEW COLUMNS GO ON THE END. See the module docblock.
 */
export const INVENTORY_COLUMNS: ReadonlyArray<Column<Product>> = [
  { header: 'id', value: p => text(p.id) },
  { header: 'brand', value: p => text(p.brand) },
  { header: 'model', value: p => text(p.model) },
  // A listing can carry its size in either place: the top-level field is what
  // the product editor writes, the spec is what an imported catalogue brings.
  // A blank storage column sends someone to the website to look it up.
  { header: 'storage', value: p => text(p.storage ?? p.specs?.storage) },
  { header: 'grade', value: p => text(p.grade) },
  { header: 'category', value: p => text(p.category) },
  { header: 'price', value: p => money(p.price) },
  { header: 'originalPrice', value: p => money(p.originalPrice) },
  { header: 'stock', value: p => count(p.stock) },
  { header: 'updatedAt', value: p => text(p.updatedAt) },
  { header: 'updatedBy', value: p => text(p.updatedBy) },
  // Products are archived, never deleted, so an export that left archived
  // rows out would not be the catalogue — it would be the storefront. The
  // column carries the whole record instead, and reads empty for a live
  // product because absent means live.
  { header: 'archivedAt', value: p => text(p.archivedAt) },
];

/**
 * The order book export.
 *
 * What the accountant and the person chasing a parcel both need: which order,
 * when, where it has got to, who it is for, what was in it and what it came
 * to. The full addresses and tracking numbers are deliberately not here —
 * this file gets emailed about, and an order export is not a mailing list.
 *
 * NEW COLUMNS GO ON THE END. See the module docblock.
 */
export const ORDER_COLUMNS: ReadonlyArray<Column<Order>> = [
  { header: 'orderId', value: o => text(o.id) },
  { header: 'placedAt', value: o => text(o.createdAt) },
  { header: 'status', value: o => text(o.status) },
  { header: 'customer', value: o => text(o.customer) },
  { header: 'contactEmail', value: o => text(o.contactEmail) },
  // Quantities, not lines. "3 items" meaning three separate line entries that
  // are really eight phones is the sort of figure someone packs against.
  {
    header: 'itemCount',
    value: o => count((o.items ?? []).reduce((n, i) => n + (Number(i?.quantity) || 0), 0)),
  },
  // One cell, semicolon-separated, because the alternative is a row per item
  // and then the total column is repeated and every SUM over it is wrong.
  {
    header: 'items',
    value: o => (o.items ?? []).map(i => `${Number(i?.quantity) || 0} × ${text(i?.name)}`).join('; '),
  },
  { header: 'currency', value: o => text(o.currency) },
  { header: 'total', value: o => money(o.total) },
];

/**
 * Whether a field would be read as a formula rather than as text.
 *
 * Excel and Google Sheets both decide a cell is a formula from its first
 * character, and quoting the field does not stop them — the quotes are
 * stripped by the CSV parser before the formula engine ever sees it. So a
 * description a seller typed as `=HYPERLINK("http://...","Click")` arrives in
 * the client's spreadsheet as a live, clickable link they did not write, and
 * `=cmd|'/C calc'!A0` is worse than that. The leading `-` is included even
 * though it looks like a minus sign, because `-1+1+cmd|...` is a formula too.
 *
 * TAB and CR are here because both are stripped as leading whitespace before
 * the first-character check happens, so a tab followed by `=` is an `=`.
 */
function isFormula(field: string): boolean {
  return /^[=+\-@\t\r]/.test(field);
}

/**
 * One field, escaped for CSV.
 *
 * Two separate jobs in a fixed order. First the formula defence: a leading
 * apostrophe is what both Excel and Sheets read as "this cell is text",
 * and it is consumed on display so the client never sees it. This is the
 * line people delete because it looks like it is corrupting the data. It is
 * not — deleting it hands whoever opens the file an executable cell that a
 * seller's description put there.
 *
 * Note that a negative number is apostrophed too and so reads as text. That
 * is accepted: none of the columns above can be negative, and a minus sign
 * that has to be re-typed is a far smaller problem than a cell that runs.
 *
 * Then RFC 4180 quoting: a field containing a comma, a double quote, CR or LF
 * is wrapped in double quotes and its own quotes are doubled. This is what
 * lets a model called `iPhone 8, 64GB "Gold"` survive the round trip.
 */
function escapeField(field: string): string {
  const guarded = isFormula(field) ? `'${field}` : field;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

/** Rows to a CSV string, RFC 4180 quoting. */
export function toCsv<T>(rows: readonly T[], columns: ReadonlyArray<Column<T>>): string {
  const header = columns.map(c => escapeField(c.header));
  const body = rows.map(row => columns.map(c => escapeField(c.value(row))));

  // CRLF, because the realistic consumer is Excel on Windows and it is what
  // RFC 4180 specifies. No trailing line break: a naive parser reads one as a
  // final record of empty strings, and an export has to be a valid import.
  return [header, ...body].map(cells => cells.join(',')).join('\r\n');
}

/** A dated, human-readable filename, e.g. 'lehart-inventory-2026-09-22.csv'. */
export function exportFilename(kind: string, now: Date = new Date()): string {
  // Local date parts rather than toISOString(). During British Summer Time an
  // export taken at half past midnight is still yesterday in UTC, so the file
  // would be stamped with the day before the one the person did the work —
  // and these files get filed by the date in their name.
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  // A kind is ours, but it reaches a filename, and a slash or a quote in a
  // filename is either silently mangled by the browser or is a path.
  const safe = kind.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return `lehart-${safe}-${stamp}.csv`;
}

/** Trigger a browser download of `csv` as `filename`. */
export function downloadCsv(filename: string, csv: string): void {
  // The byte-order mark is what tells Excel the file is UTF-8. Without it,
  // Excel on a UK machine assumes the Windows-1252 code page and every £
  // becomes Â£ — which is the first thing the client notices and the last
  // thing anyone thinks to look for in a CSV writer.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    // Firefox only acts on a click if the anchor is actually in the document.
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    // An object URL pins its blob for the lifetime of the document, and
    // nothing collects it. Staff export the catalogue several times in a
    // sitting while comparing counts, so leaving these behind keeps a copy of
    // the whole catalogue in memory per click. The finally is so a browser
    // that throws on the click still gives the memory back.
    URL.revokeObjectURL(url);
  }
}
