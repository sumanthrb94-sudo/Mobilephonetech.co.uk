import { slugify } from './adminApi';

/**
 * Splitting one listing that names several colours in its own "Colour
 * options" field into one listing per colour.
 *
 * This is the storage pattern applied to colour. A 64GB and a 128GB have
 * always been separate rows, because they are separate handsets with their
 * own stock — see src/lib/productSiblings.ts. A listing that instead names
 * "Blue, Silver" in one Colour options field is the same row claiming to be
 * both at once, which is why the product page renders it as plain text
 * rather than as swatches: clicking "Silver" on that row would not get
 * anyone a silver handset, because both colours are the same document with
 * the same stock. Splitting is what turns the claim into fact.
 *
 * PLANNING ONLY
 *
 * Nothing here talks to Firestore. src/lib/adminApi.ts's
 * splitProductByColour does the write, as one batch, from the plan this
 * module checks. Kept apart so the rules that matter — a real stock count
 * for every colour, no slug reused, no two colours sharing one — can be
 * tested without a database.
 *
 * WHY STOCK HAS NO DEFAULT
 *
 * An even split of the listing's current total is a number nobody counted.
 * Printing it in the form invites the person doing the split to leave it
 * exactly where every other part of this codebase refuses to invent a
 * number: a price, a stock count, a variant nobody stocks. The one true fact
 * available here — the current total — is shown once, for reference, next
 * to fields that start empty.
 */

/** One row of the split, as the form holds it before it is sent. */
export interface ColourSplitRow {
  colour: string;
  /** Proposed URL slug for this colour's own listing. */
  id: string;
  /** Kept as text so a half-typed number does not vanish while editing. */
  stock: string;
}

/**
 * A first guess at each row's slug, for the form to open with. Stock starts
 * blank — see the module docs for why.
 */
export function initialSplitRows(
  product: { brand: string; model: string; storage?: string },
  colours: readonly string[],
): ColourSplitRow[] {
  return colours.map(colour => ({
    colour,
    id: slugify(product.brand, product.model, product.storage ?? '', colour),
    stock: '',
  }));
}

export interface ColourSplitProblem {
  /** Which row this is about. */
  index: number;
  message: string;
}

/**
 * What stops the split, one entry per row with something wrong.
 *
 * Checked entirely before anything is sent, so a mistake is pointed at the
 * field it is in rather than surfacing as a database error after the button
 * is pressed.
 */
export function splitProblems(rows: readonly ColourSplitRow[], originalId: string): ColourSplitProblem[] {
  const problems: ColourSplitProblem[] = [];
  const seenAt = new Map<string, number>();

  rows.forEach((row, index) => {
    const stock = row.stock.trim();
    if (!stock) problems.push({ index, message: 'Enter the real stock count for this colour.' });
    else if (!/^\d+$/.test(stock)) problems.push({ index, message: 'A whole number, 0 or more.' });

    const id = row.id.trim();
    if (!id) {
      problems.push({ index, message: 'Needs a URL slug.' });
      return;
    }
    // The original is archived in the same write that creates the new rows.
    // A new listing that reused its slug would be the batch writing to that
    // one document twice — once to create it, once to archive it.
    if (id === originalId) {
      problems.push({ index, message: 'Cannot reuse this listing’s own slug — it is being archived.' });
      return;
    }
    const dup = seenAt.get(id);
    if (dup !== undefined) {
      problems.push({ index, message: `Same slug as "${rows[dup].colour}" above — give it its own.` });
      return;
    }
    seenAt.set(id, index);
  });

  return problems;
}

/** The rows, parsed to numbers, once splitProblems has nothing to say about them. */
export function parsedSplitRows(
  rows: readonly ColourSplitRow[],
): Array<{ colour: string; id: string; stock: number }> {
  return rows.map(r => ({ colour: r.colour, id: r.id.trim(), stock: parseInt(r.stock.trim(), 10) }));
}

/** The total entered so far, for the reference line under the form. */
export function totalSplitStock(rows: readonly ColourSplitRow[]): number {
  return rows.reduce((sum, r) => {
    const n = parseInt(r.stock.trim(), 10);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}
