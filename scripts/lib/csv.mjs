/**
 * One CSV parser, used by every script that reads one.
 *
 * Not a split on commas. Colour, notes and model are free text typed by staff:
 * the day someone writes "Black, Grey" a naive split shifts every column after
 * it by one, and the failure is silent — a price column becomes a colour and
 * the import writes nonsense that looks plausible.
 *
 * There were three copies of this before, and they had already drifted: the
 * image importer's was regex-based and matched nothing, which is why a
 * correctly named file was reported as unrecognised.
 */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];

  const header = rows.shift().map((h) => h.trim());
  return rows
    .filter((r) => r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

/** The inverse, for scripts that write one. */
export function toCsv(header, rows) {
  const esc = (v) => (/[",\n]/.test(String(v ?? '')) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));
  return [header.join(','), ...rows.map((r) => header.map((h) => esc(r[h])).join(','))].join('\n') + '\n';
}
