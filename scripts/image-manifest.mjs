#!/usr/bin/env node
/**
 * The worklist for photographing or sourcing product images.
 *
 *   node scripts/image-manifest.mjs
 *
 * Writes data/image-manifest.csv — one row per image the catalogue wants,
 * with the exact filename to save it as. Hand it to whoever is collecting the
 * images; anything named correctly is picked up by scripts/import-images.mjs
 * without further thought.
 *
 * Ordered by units in stock, descending, and that ordering is the point. Five
 * listings carry 45% of the shelf. Photographing those five is most of the
 * visible benefit of photographing all seventy, and doing them first means the
 * shop looks real days earlier.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalogue, slugify } from './lib/catalogue.mjs';
import { parseCsv, toCsv } from './lib/csv.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const { products } = buildCatalogue(parseCsv(readFileSync(join(root, 'data/inventory.csv'), 'utf8')));

const rows = [];
for (const p of [...products].sort((a, b) => b.stock - a.stock)) {
  // The main image is what the grid, the search results and the order emails
  // all show, so it is worth having even when the colours are not.
  rows.push({
    priority: 'main',
    units: p.stock,
    productId: p.id,
    brand: p.brand,
    model: p.model,
    storage: p.storage ?? '',
    colour: '',
    saveAs: `${p.id}.jpg`,
    searchHint: `${p.brand} ${p.model} ${p.storage ?? ''}`.trim(),
  });

  // Only worth collecting where the colour is actually selectable.
  if (p.colorOptions.length > 1) {
    for (const colour of p.colorOptions) {
      rows.push({
        priority: 'colour',
        units: p.variants.filter((v) => v.color === colour).reduce((s, v) => s + v.stock, 0),
        productId: p.id,
        brand: p.brand,
        model: p.model,
        storage: p.storage ?? '',
        colour,
        saveAs: `${p.id}--${slugify(colour)}.jpg`,
        searchHint: `${p.brand} ${p.model} ${p.storage ?? ''} ${colour}`.trim(),
      });
    }
  }
}

const header = ['priority', 'units', 'productId', 'brand', 'model', 'storage', 'colour', 'saveAs', 'searchHint'];
writeFileSync(join(root, 'data/image-manifest.csv'), toCsv(header, rows));

const main = rows.filter((r) => r.priority === 'main');
const top = main.slice(0, 10);
const covered = top.reduce((s, r) => s + r.units, 0);
const total = main.reduce((s, r) => s + r.units, 0);

console.log(`\n  data/image-manifest.csv written — ${rows.length} images wanted`);
console.log(`    ${main.length} main, ${rows.length - main.length} colour variants\n`);
console.log(`  The first ten cover ${covered} of ${total} units in stock (${Math.round((covered / total) * 100)}%):\n`);
for (const r of top) {
  console.log(`    ${String(r.units).padStart(3)} units   ${r.searchHint.padEnd(34)} -> ${r.saveAs}`);
}
console.log('');
