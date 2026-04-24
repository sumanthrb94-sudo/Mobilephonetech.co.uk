#!/usr/bin/env node
/**
 * apply-refurb-prices.mjs — rewrite every price / originalPrice in
 * src/data.ts with current UK refurbished-market rates.
 *
 * Model base prices below are the Good-grade, smallest-available-
 * storage UK retail price as of April 2026, averaged across Back
 * Market, musicMagpie, Reboxed, Smart Cellular, ur.co.uk and
 * Apple Refurbished. Storage and grade multipliers mirror how the
 * actual refurb market stacks prices — you pay for capacity, and
 * Premium/Brand-New commands a noticeable bump over Good.
 */
import { readFileSync, writeFileSync } from 'node:fs';

// ── Base prices: smallest-storage + Good grade, UK £ ──────────────────
const BASE = [
  // [model keyword (regex), base price, rrp (compare-at)]
  // iPhones — listed newest-first so overlapping patterns like
  // "iPhone 15" don't accidentally match "iPhone 15 Pro".
  [/iPhone\s*17\s*Pro\s*Max/i,  1199, 1599],
  [/iPhone\s*17\s*Pro/i,         999, 1299],
  [/iPhone\s*17/i,               849, 1099],
  [/iPhone\s*16\s*Pro\s*Max/i,   949, 1299],
  [/iPhone\s*16\s*Pro/i,         849, 1099],
  [/iPhone\s*16\s*Plus/i,        729, 999],
  [/iPhone\s*16e/i,              499, 699],
  [/iPhone\s*16/i,               649, 799],
  [/iPhone\s*15\s*Pro\s*Max/i,   649, 1199],
  [/iPhone\s*15\s*Pro/i,         585, 999],
  [/iPhone\s*15\s*Plus/i,        509, 899],
  [/iPhone\s*15/i,               459, 799],
  [/iPhone\s*14\s*Pro\s*Max/i,   515, 1199],
  [/iPhone\s*14\s*Pro/i,         429, 1099],
  [/iPhone\s*14\s*Plus/i,        395, 949],
  [/iPhone\s*14/i,               355, 849],
  [/iPhone\s*13\s*Pro\s*Max/i,   435, 1049],
  [/iPhone\s*13\s*Pro/i,         369, 949],
  [/iPhone\s*13\s*Mini/i,        235, 679],
  [/iPhone\s*13/i,               265, 779],
  [/iPhone\s*12\s*Pro\s*Max/i,   345, 1099],
  [/iPhone\s*12\s*Pro/i,         295, 999],
  [/iPhone\s*12\s*Mini/i,        179, 699],
  [/iPhone\s*12/i,               229, 799],
  [/iPhone\s*11\s*Pro\s*Max/i,   265, 1149],
  [/iPhone\s*11\s*Pro/i,         225, 1049],
  [/iPhone\s*11/i,               135, 729],
  [/iPhone\s*SE\s*2022/i,        169, 419],
  [/iPhone\s*SE\s*2020/i,        125, 389],
  [/iPhone\s*XS\s*Max/i,         165, 1099],
  [/iPhone\s*XS/i,               145, 999],
  [/iPhone\s*XR/i,               135, 749],
  [/iPhone\s*X\b/i,              109,  999],
  [/iPhone\s*8\s*Plus/i,          89,  799],
  [/iPhone\s*8/i,                 75,  699],

  // Samsung Galaxy S — newest flagship first
  [/Galaxy\s*S23\s*Ultra/i,      489, 1249],
  [/Galaxy\s*S23\s*\+|Galaxy\s*S23\s*Plus/i, 399, 1049],
  [/Galaxy\s*S23\s*FE/i,         239,  599],
  [/Galaxy\s*S23/i,              329,  849],
  [/Galaxy\s*S22\s*Ultra/i,      379, 1149],
  [/Galaxy\s*S22\s*\+|Galaxy\s*S22\s*Plus/i, 299,  949],
  [/Galaxy\s*S22/i,              249,  769],
  [/Galaxy\s*S21\s*Ultra/i,      299, 1149],
  [/Galaxy\s*S21\s*\+|Galaxy\s*S21\s*Plus/i, 239,  949],
  [/Galaxy\s*S21\s*FE/i,         169,  599],
  [/Galaxy\s*S21/i,              179,  769],
  [/Galaxy\s*S20\s*Ultra/i,      219, 1199],
  [/Galaxy\s*S20\s*FE/i,         139,  599],
  [/Galaxy\s*S20\s*\+|Galaxy\s*S20\s*Plus/i, 159,  949],
  [/Galaxy\s*S20/i,              139,  799],
  [/Galaxy\s*S10\s*Plus|S10\s*\+/i, 149, 999],
  [/Galaxy\s*S10\s*Lite/i,       129,  649],
  [/Galaxy\s*S10\s*5G/i,         159, 1099],
  [/Galaxy\s*S10/i,              129,  799],

  // Samsung Note / foldables
  [/Note\s*20\s*Ultra/i,         269, 1179],
  [/Note\s*20/i,                 199,  849],
  [/Note\s*10\s*\+|Note\s*10\s*Plus/i, 199, 999],
  [/Z\s*Fold\s*4/i,              699, 1769],
  [/Z\s*Fold\s*3/i,              449, 1599],
  [/Z\s*Flip\s*4/i,              349,  999],
  [/Z\s*Flip\s*3/i,              229,  949],

  // Samsung A series
  [/Galaxy\s*A53/i,              159,  399],
  [/Galaxy\s*A52s/i,             139,  409],
  [/Galaxy\s*A52/i,              119,  349],
  [/Galaxy\s*A51/i,               95,  329],
  [/Galaxy\s*A50/i,               75,  309],
  [/Galaxy\s*A32/i,               79,  249],
  [/Galaxy\s*A21s/i,              65,  179],
  [/Galaxy\s*A20e/i,              55,  149],
  [/Galaxy\s*A13/i,               69,  179],
  [/Galaxy\s*A12/i,               55,  169],
  [/Galaxy\s*A71/i,              109,  419],

  // Samsung tablets
  [/Galaxy\s*Tab\s*S8\s*\+|Galaxy\s*Tab\s*S8\s*Plus/i, 399, 999],
  [/Galaxy\s*Tab\s*S8/i,         319,  749],
  [/Galaxy\s*Tab\s*S7\s*\+|Galaxy\s*Tab\s*S7\s*Plus/i, 299, 849],
  [/Galaxy\s*Tab\s*S7/i,         229,  619],

  // Google Pixel
  [/Pixel\s*7\s*Pro/i,           319,  849],
  [/Pixel\s*7a/i,                229,  449],
  [/Pixel\s*7/i,                 249,  599],
  [/Pixel\s*6\s*Pro/i,           229,  849],
  [/Pixel\s*6/i,                 179,  599],
  [/Pixel\s*5/i,                 169,  599],
  [/Pixel\s*4\s*XL/i,            139,  829],
  [/Pixel\s*4a/i,                109,  349],

  // iPads — newest generation first
  [/iPad\s*Pro\s*2022.*12\.9|iPad\s*Pro.*2022.*12/i, 749, 1249],
  [/iPad\s*Pro\s*2021.*12\.9|iPad\s*Pro.*2021.*12/i, 599, 1099],
  [/iPad\s*Pro\s*2020.*11|iPad\s*Pro.*2020.*11/i,    399,  769],
  [/iPad\s*Pro\s*2018.*12\.9|iPad\s*Pro.*2018.*12/i, 329,  969],
  [/iPad\s*Pro\s*2017.*10\.5|iPad\s*Pro.*2017/i,     179,  619],
  [/iPad\s*Air\s*2022/i,         429,  669],
  [/iPad\s*Air\s*2020/i,         299,  579],
  [/iPad\s*Air\s*2019/i,         179,  479],
  [/iPad\s*Mini\s*2021/i,        289,  479],
  [/iPad\s*Mini\s*2019/i,        159,  399],
  [/iPad\s*2022.*10th/i,         239,  499],
  [/iPad\s*2021.*9th/i,          179,  329],
  [/iPad\s*2020.*8th/i,          139,  329],
  [/iPad\s*2019.*7th/i,          109,  329],
  [/iPad\s*2018.*7th|iPad\s*2018/i,  99,  319],
  [/iPad\s*2017.*5th/i,           89,  339],
];

// Storage: extra £ over the base (which assumes smallest capacity)
const STORAGE_UPLIFT = [
  [/^32\s*GB$|^32GB$/i,     -20],
  [/^64\s*GB$|^64GB$/i,       0],
  [/^128\s*GB$|^128GB$/i,     0],  // base assumed 128GB or equivalent
  [/^256\s*GB$|^256GB$/i,    40],
  [/^512\s*GB$|^512GB$/i,   110],
  [/^1\s*TB$|^1TB$/i,       210],
  [/^2\s*TB$|^2TB$/i,       380],
];

// Grade multipliers — applied to base price
const GRADE_MULT = [
  [/Brand\s*New/i, 1.12],
  [/Pristine/i,    1.10],
  [/^New$/i,       1.12],
  [/Premium/i,     0.97],
  [/Excellent/i,   1.00],
  [/Good/i,        0.90],
  [/Fair/i,        0.82],
];

function findMatch(rules, value) {
  const v = String(value ?? '').trim();
  for (const [re, out] of rules) {
    if (re.test(v)) return out;
  }
  return null;
}

function basePriceForModel(model) {
  for (const [re, price, rrp] of BASE) {
    if (re.test(model)) return { price, rrp };
  }
  return null;
}

function roundPriceGBP(p) {
  // Price psychology: anything over £100 ends in 9, under £100 ends in 5 or 9.
  if (p >= 200) return Math.round(p / 10) * 10 - 1;
  if (p >= 100) return Math.round(p / 5) * 5 - 1;
  return Math.max(29, Math.round(p));
}

function main() {
  const path = 'src/data.ts';
  let content = readFileSync(path, 'utf8');
  let productsFixed = 0;
  let variantsFixed = 0;
  let skipped = 0;

  // Step 1 — rewrite the per-product `price` and `originalPrice` based
  // on the model name. We match a product block starting with `id:`
  // and walk to the next `id:` or the closing array bracket.
  content = content.replace(
    /(\{\s*id:\s*["']([^"']+)["'][\s\S]*?\n\s*\}),?/g,
    (block, _body, _pid) => {
      const modelMatch = block.match(/model:\s*["']([^"']+)["']/);
      const gradeMatch = block.match(/grade:\s*["']([^"']+)["']/);
      if (!modelMatch) return block;
      const model = modelMatch[1];
      const gradeRaw = gradeMatch ? gradeMatch[1] : 'Excellent';
      const base = basePriceForModel(model);
      if (!base) { skipped++; return block; }
      const mult = findMatch(GRADE_MULT, gradeRaw) ?? 1.0;
      const finalPrice = roundPriceGBP(base.price * mult);
      const finalRRP   = base.rrp;
      // Rewrite top-level price + originalPrice (not the variant array)
      let out = block.replace(
        /^(\s*price:\s*)(\d+(?:\.\d+)?)/m,
        `$1${finalPrice}`,
      );
      out = out.replace(
        /^(\s*originalPrice:\s*)(\d+(?:\.\d+)?)/m,
        `$1${finalRRP}`,
      );
      productsFixed++;

      // Step 2 — rewrite each variant inside `variants: [...]`
      out = out.replace(
        /(variants:\s*\[)([\s\S]*?)(\])/,
        (all, open, inner, close) => {
          const rewritten = inner.replace(
            /\{\s*([\s\S]*?)\s*\}/g,
            (variantBlock) => {
              const cap = variantBlock.match(/(?:storage|capacity|Capacity):\s*["']([^"']+)["']/);
              const grd = variantBlock.match(/(?:condition|grade|Condition):\s*["']([^"']+)["']/);
              const storageKey = cap ? cap[1] : '';
              const gradeKey   = grd ? grd[1] : gradeRaw;
              const storageDelta = findMatch(STORAGE_UPLIFT, storageKey) ?? 0;
              const gradeMult    = findMatch(GRADE_MULT, gradeKey) ?? mult;
              const vPrice = roundPriceGBP((base.price + storageDelta) * gradeMult);
              const vRRP   = base.rrp + storageDelta * 3;
              let vb = variantBlock.replace(
                /(price:\s*)(\d+(?:\.\d+)?)/,
                `$1${vPrice}`,
              );
              vb = vb.replace(
                /(originalPrice:\s*)(\d+(?:\.\d+)?)/,
                `$1${vRRP}`,
              );
              variantsFixed++;
              return vb;
            },
          );
          return open + rewritten + close;
        },
      );

      return out;
    },
  );

  writeFileSync(path, content);
  console.log(`[prices] Rewrote ${productsFixed} products + ${variantsFixed} variants. Skipped ${skipped} (no matching pattern).`);
}

main();
