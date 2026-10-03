import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsv } from './lib/csv.mjs';

const rows = parseCsv(readFileSync('data/inventory.csv', 'utf8'));
const units = rows.map(r => ({
  stockInDate: r['Stock In Date'] || r.stockInDate || '',
  model: r.Model || r.model || '',
  imei: r.IMEI || r.imei || '',
  condition: r.Grade || r.condition || '',
  storage: r.Storage || r.storage || '',
  simType: r['SIM Type'] || r.simType || '',
  color: r.Colour || r.color || '',
  supplier: r.Supplier || r.supplier || '',
  buyPrice: parseFloat(r.BP || r.buyPrice || '0') || 0,
  stockLocation: r['Stock Type'] || r.stockType || 'OFFICE',
  notes: r.Notes || r.notes || '',
  stockRestoredDate: r['Return Date'] || r.returnDate || null,
}));

writeFileSync('data/inventory.json', JSON.stringify(units, null, 2));
console.log(`Generated data/inventory.json with ${units.length} units.`);
