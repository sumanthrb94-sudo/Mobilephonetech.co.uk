import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  INVENTORY_COLUMNS, ORDER_COLUMNS, toCsv, exportFilename, downloadCsv,
  type Column,
} from '../../lib/adminExport';
import type { Product } from '../../types';
import type { AdminOrder } from '../../lib/orders';

/**
 * Taking the catalogue and the order book out of the building.
 *
 * Two properties are pinned here, and they are the reasons the module exists.
 *
 * The first is the column contract. The files this produces are opened in
 * spreadsheets that already contain formulas written against column letters,
 * so moving a column silently changes what every one of those formulas adds
 * up. The literal arrays below are that contract written down.
 *
 * The second is that an export is always a valid import. A model called
 * `iPhone 8, 64GB "Gold"` has to come back out of the file as exactly that,
 * and a description that starts with `=` has to come back as text rather than
 * running in whatever the client opens it in.
 */

/**
 * A minimal RFC 4180 reader, so the round-trip tests are testing the property
 * rather than testing that toCsv agrees with itself. Deliberately dumb: quoted
 * fields, doubled quotes, CRLF records, nothing else.
 */
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;

  while (i < csv.length) {
    const ch = csv[i];

    if (quoted) {
      if (ch === '"' && csv[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (ch === '"') { quoted = false; i += 1; continue; }
      field += ch; i += 1; continue;
    }

    if (ch === '"') { quoted = true; i += 1; continue; }
    if (ch === ',') { row.push(field); field = ''; i += 1; continue; }
    if (ch === '\r' && csv[i + 1] === '\n') {
      row.push(field); rows.push(row); row = []; field = ''; i += 2; continue;
    }

    field += ch; i += 1;
  }

  row.push(field);
  rows.push(row);
  return rows;
}

const product = (over: Partial<Product> & { id: string }): Product => ({
  brand: 'Apple', model: 'iPhone 8', category: 'Phones',
  storage: '64 GB', price: 55, originalPrice: 99, stock: 2,
  grade: 'Excellent', batteryHealth: 90, warrantyMonths: 12, returnDays: 30,
  imageUrl: '', isCertified: true, specs: {} as Product['specs'],
  ...over,
} as Product);

const order = (over: Partial<AdminOrder> & { id: string }): AdminOrder => ({
  status: 'pending', total: 110, currency: 'GBP',
  createdAt: '2026-09-20T10:15:00.000Z',
  contactEmail: 'someone@example.com', customer: 'Jo Bloggs',
  address: ['1 High Street', 'Leeds'],
  items: [{ name: 'iPhone 8 64GB', quantity: 2, price: 55 }],
  ...over,
} as AdminOrder);

/** The cells of one row, by header, for readable assertions. */
function cells<T>(row: T, columns: ReadonlyArray<Column<T>>): Record<string, string> {
  return Object.fromEntries(columns.map(c => [c.header, c.value(row)]));
}

describe('the column contract', () => {
  /**
   * These two arrays are the contract, not a description of it.
   *
   * A new column goes on the END of the list. An existing column is never
   * renamed, never removed and never moved. The spreadsheets these files feed
   * address columns by letter — `=SUM(I2:I999)` is the stock total right up
   * until a column is inserted before I, at which point it is the original
   * price total and nobody finds out.
   *
   * So if this test fails because you added something in the middle, the test
   * is right and the change is wrong. Append instead and update the array.
   */

  it('pins the inventory columns and their order', () => {
    expect(INVENTORY_COLUMNS.map(c => c.header)).toEqual([
      'id',
      'brand',
      'model',
      'storage',
      'grade',
      'category',
      'price',
      'originalPrice',
      'stock',
      'updatedAt',
      'updatedBy',
      'archivedAt',
    ]);
  });

  it('pins the order columns and their order', () => {
    expect(ORDER_COLUMNS.map(c => c.header)).toEqual([
      'orderId',
      'placedAt',
      'status',
      'customer',
      'contactEmail',
      'itemCount',
      'items',
      'currency',
      'total',
    ]);
  });

  /**
   * A duplicated header is the one way an append can still break a consumer:
   * an importer matching on header text picks whichever it saw last, so half
   * the file quietly stops being read.
   */
  it('has no duplicate headers in either export', () => {
    for (const columns of [INVENTORY_COLUMNS, ORDER_COLUMNS]) {
      const headers = columns.map(c => c.header);
      expect(new Set(headers).size).toBe(headers.length);
    }
  });
});

describe('RFC 4180 quoting', () => {
  /**
   * The shop genuinely lists phones as `iPhone 8, 64GB "Gold"`. A comma ends
   * the field and a bare quote confuses every parser there is, so if this is
   * wrong the export splits one product across two columns and everything to
   * its right shifts by one for that row only — which is the sort of damage
   * nobody notices until the stock count is reconciled.
   */

  const field = (value: string): string => toCsv([{ value }], [{ header: 'h', value: r => r.value }]);

  it('quotes a field containing a comma', () => {
    expect(field('64GB, Gold')).toBe('h\r\n"64GB, Gold"');
  });

  it('quotes a field containing a double quote, and doubles the quote', () => {
    expect(field('say "hello"')).toBe('h\r\n"say ""hello"""');
  });

  it('quotes a field containing a line break', () => {
    expect(field('one\ntwo')).toBe('h\r\n"one\ntwo"');
    expect(field('one\r\ntwo')).toBe('h\r\n"one\r\ntwo"');
  });

  it('leaves an ordinary field alone', () => {
    expect(field('iPhone 8')).toBe('h\r\niPhone 8');
  });

  it('round-trips a model containing a comma and quotes', () => {
    const nasty = 'iPhone 8, 64GB "Gold"';
    const csv = toCsv([product({ id: 'p1', model: nasty })], INVENTORY_COLUMNS);
    const rows = parseCsv(csv);

    expect(rows[0]).toEqual(INVENTORY_COLUMNS.map(c => c.header));
    expect(rows[1][rows[0].indexOf('model')]).toBe(nasty);
  });

  it('round-trips every column of a full row', () => {
    const row = product({
      id: 'p1', model: 'iPhone 8, 64GB "Gold"',
      updatedAt: '2026-09-21T09:00:00.000Z', updatedBy: 'sam@lehart.co.uk',
    });
    const parsed = parseCsv(toCsv([row], INVENTORY_COLUMNS));

    expect(parsed[1]).toEqual(INVENTORY_COLUMNS.map(c => c.value(row)));
  });
});

describe('CSV injection defence', () => {
  /**
   * Excel and Google Sheets decide a cell is a formula from its first
   * character, and they do it after the CSV parser has stripped the quotes —
   * so quoting is no defence at all. A seller pasting a supplier's blurb that
   * begins `=HYPERLINK(...)` into a product description would otherwise hand
   * the client an executable cell in a file they were emailed, and
   * `=cmd|'/C calc'!A0` is the same hole pointed somewhere worse.
   *
   * A leading apostrophe is what both applications read as "this is text". It
   * is consumed on display, so nobody sees it. It looks like it is corrupting
   * the data, which is why it needs a test saying out loud that it is not.
   */

  const field = (value: string): string =>
    toCsv([{ value }], [{ header: 'h', value: r => r.value }]).split('\r\n')[1];

  it('neutralises every character a spreadsheet reads as a formula', () => {
    expect(field('=HYPERLINK("http://evil","Click")')).toBe(`"'=HYPERLINK(""http://evil"",""Click"")"`);
    expect(field('+1+1')).toBe(`'+1+1`);
    expect(field('-1+1')).toBe(`'-1+1`);
    expect(field('@SUM(A1)')).toBe(`'@SUM(A1)`);
  });

  it('neutralises leading tab and carriage return, which are stripped before the check', () => {
    // A spreadsheet trims these first, so a tab followed by `=` is an `=`.
    expect(field('\t=1+1')).toBe(`'\t=1+1`);
    expect(field('\r=1+1')).toBe(`"'\r=1+1"`);
  });

  it('leaves text that merely contains a formula character alone', () => {
    expect(field('A+B')).toBe('A+B');
    expect(field('sales@lehart.co.uk')).toBe('sales@lehart.co.uk');
  });

  it('protects the description a seller actually typed, through the real columns', () => {
    const csv = toCsv([product({ id: 'p1', model: '=1+1' })], INVENTORY_COLUMNS);
    expect(parseCsv(csv)[1][INVENTORY_COLUMNS.findIndex(c => c.header === 'model')]).toBe(`'=1+1`);
  });
});

describe('line endings', () => {
  /**
   * CRLF because the file is opened in Excel on Windows, which is what the
   * spec assumes and what the client runs. No trailing break: a naive reader
   * takes one as a final record of empty strings, and an export that imports
   * as a blank product is not a valid import.
   */

  it('separates records with CRLF and does not end with one', () => {
    const csv = toCsv([product({ id: 'a' }), product({ id: 'b' })], INVENTORY_COLUMNS);

    expect(csv.split('\r\n')).toHaveLength(3);
    expect(csv.endsWith('\r\n')).toBe(false);
    expect(csv.includes('\n\n')).toBe(false);
  });

  it('emits the header row even with nothing to export', () => {
    // An empty catalogue is still a catalogue, and a headerless file is not
    // something the importer can read back.
    expect(toCsv([], INVENTORY_COLUMNS)).toBe(INVENTORY_COLUMNS.map(c => c.header).join(','));
  });
});

describe('absent values', () => {
  /**
   * `String(undefined)` is the string "undefined". A stock sheet where a
   * hundred rows claim the storage is "undefined" is worse than one where the
   * cell is blank, because blank reads as "we do not know" and "undefined"
   * reads as a value somebody entered.
   */

  it('writes an empty cell for every missing optional field', () => {
    const bare = product({ id: 'p1', storage: undefined, specs: {} as Product['specs'] });
    const row = cells(bare, INVENTORY_COLUMNS);

    expect(row.storage).toBe('');
    expect(row.updatedAt).toBe('');
    expect(row.updatedBy).toBe('');
    expect(toCsv([bare], INVENTORY_COLUMNS)).not.toContain('undefined');
    expect(toCsv([bare], INVENTORY_COLUMNS)).not.toContain('null');
  });

  it('writes an empty cell rather than NaN for a missing number', () => {
    const broken = product({ id: 'p1', stock: undefined as unknown as number });
    expect(cells(broken, INVENTORY_COLUMNS).stock).toBe('');
    expect(toCsv([broken], INVENTORY_COLUMNS)).not.toContain('NaN');
  });

  it('falls back to the spec when a listing carries its size there', () => {
    const imported = product({
      id: 'p1', storage: undefined,
      specs: { storage: '256 GB' } as Product['specs'],
    });
    expect(cells(imported, INVENTORY_COLUMNS).storage).toBe('256 GB');
  });
});

describe('archived products', () => {
  /**
   * Products are archived rather than deleted, because every order that ever
   * contained one still points at it. So the export has to carry archived
   * rows and say which they are — and a live product has to read as an empty
   * cell, not as the word "undefined", or the column is unusable for exactly
   * the filter a shop owner opens it to apply.
   */

  it('reads empty for a live product', () => {
    expect(cells(product({ id: 'p1' }), INVENTORY_COLUMNS).archivedAt).toBe('');
  });

  it('carries the timestamp for an archived one', () => {
    const gone = product({ id: 'p1', archivedAt: '2026-09-01T12:00:00.000Z' });
    expect(cells(gone, INVENTORY_COLUMNS).archivedAt).toBe('2026-09-01T12:00:00.000Z');
  });

  it('exports archived and live products alike', () => {
    const rows = [product({ id: 'live' }), product({ id: 'gone', archivedAt: '2026-09-01T12:00:00.000Z' })];
    expect(parseCsv(toCsv(rows, INVENTORY_COLUMNS))).toHaveLength(3);
  });
});

describe('money and counts', () => {
  /**
   * These columns get summed. A £ sign makes Excel treat the column as text
   * and refuse to total it, and an importer would have to strip it back off,
   * so the cell holds plain digits and the currency is its own column.
   */

  it('writes prices as plain numbers to two places', () => {
    const row = cells(product({ id: 'p1', price: 55, originalPrice: 99.5 }), INVENTORY_COLUMNS);
    expect(row.price).toBe('55.00');
    expect(row.originalPrice).toBe('99.50');
  });

  it('counts items by quantity rather than by line', () => {
    const o = order({
      id: 'o1',
      items: [
        { name: 'iPhone 8', quantity: 2, price: 55 },
        { name: 'Case', quantity: 6, price: 5 },
      ],
    });
    const row = cells(o, ORDER_COLUMNS);

    expect(row.itemCount).toBe('8');
    expect(row.items).toBe('2 × iPhone 8; 6 × Case');
  });

  it('survives an order with no items at all', () => {
    const row = cells(order({ id: 'o1', items: [] }), ORDER_COLUMNS);
    expect(row.itemCount).toBe('0');
    expect(row.items).toBe('');
  });
});

describe('exportFilename', () => {
  /**
   * These files get filed by the date in their name, so the date has to be
   * the day the person did the work. `toISOString()` would stamp a half past
   * midnight export during British Summer Time with the previous day.
   */

  it('names the kind and the local date', () => {
    expect(exportFilename('inventory', new Date(2026, 8, 22, 14, 0))).toBe('lehart-inventory-2026-09-22.csv');
  });

  it('pads single-digit months and days', () => {
    expect(exportFilename('orders', new Date(2026, 0, 5, 9, 0))).toBe('lehart-orders-2026-01-05.csv');
  });

  it('uses the local day, not the UTC one', () => {
    // Half past midnight on the 23rd is still the 22nd in UTC under BST.
    const justAfterMidnight = new Date(2026, 8, 23, 0, 30);
    expect(exportFilename('inventory', justAfterMidnight)).toContain('2026-09-23');
  });

  it('keeps anything odd in the kind out of the filename', () => {
    // A slash reaching a download filename is either silently mangled or a path.
    expect(exportFilename('Stock Count/2025', new Date(2026, 8, 22)))
      .toBe('lehart-stock-count-2025-2026-09-22.csv');
  });
});

describe('downloadCsv', () => {
  /**
   * Two things that are invisible when they go wrong.
   *
   * Without the byte-order mark Excel on a UK machine assumes Windows-1252
   * and every £ in the file becomes Â£ — the client sees it immediately and
   * nobody thinks to look in the CSV writer for it.
   *
   * Without the revoke, each object URL pins a copy of the whole catalogue in
   * memory for as long as the page is open, and staff export several times in
   * a sitting while comparing counts.
   */

  const created: Blob[] = [];
  const revoked: string[] = [];
  const clicked: HTMLAnchorElement[] = [];

  const realClick = HTMLAnchorElement.prototype.click;
  const realCreate = URL.createObjectURL;
  const realRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    created.length = 0;
    revoked.length = 0;
    clicked.length = 0;

    URL.createObjectURL = ((blob: Blob) => {
      created.push(blob);
      return `blob:http://localhost/${created.length}`;
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = ((url: string) => { revoked.push(url); }) as typeof URL.revokeObjectURL;

    // Stubbed rather than allowed through: a real click on a blob href makes
    // jsdom attempt a navigation it has not implemented, which is noise.
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) { clicked.push(this); };
  });

  afterEach(() => {
    HTMLAnchorElement.prototype.click = realClick;
    URL.createObjectURL = realCreate;
    URL.revokeObjectURL = realRevoke;
  });

  it('prepends a UTF-8 BOM so Excel reads £ correctly', async () => {
    downloadCsv('lehart-inventory-2026-09-22.csv', 'price\r\n£55.00');

    expect(created).toHaveLength(1);

    // Asserted on the bytes, not on Blob.text(): the UTF-8 decode that text()
    // performs strips a leading BOM, so reading the blob back as a string
    // would pass whether or not the mark is actually in the file.
    const bytes = new Uint8Array(await created[0].arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xEF, 0xBB, 0xBF]);
    expect(await created[0].text()).toContain('£55.00');
    expect(created[0].type).toContain('charset=utf-8');
  });

  it('revokes the object URL it created', () => {
    downloadCsv('a.csv', 'h\r\n1');
    expect(revoked).toEqual(['blob:http://localhost/1']);
  });

  it('clicks an anchor carrying the filename, and leaves nothing in the document', () => {
    downloadCsv('lehart-orders-2026-09-22.csv', 'h\r\n1');

    expect(clicked).toHaveLength(1);
    expect(clicked[0].download).toBe('lehart-orders-2026-09-22.csv');
    expect(clicked[0].href).toBe('blob:http://localhost/1');
    // Left behind, these accumulate one dead anchor per export.
    expect(document.querySelectorAll('a')).toHaveLength(0);
  });

  it('still revokes when the click throws', () => {
    HTMLAnchorElement.prototype.click = () => { throw new Error('blocked'); };

    expect(() => downloadCsv('a.csv', 'h')).toThrow('blocked');
    expect(revoked).toEqual(['blob:http://localhost/1']);
  });
});
