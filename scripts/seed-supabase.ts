#!/usr/bin/env tsx
/**
 * Seed Supabase products table from the static data.ts inventory.
 *
 * Usage:
 *   VITE_SUPABASE_URL=https://xxx.supabase.co \
 *   VITE_SUPABASE_ANON_KEY=eyJ... \
 *   npx tsx scripts/seed-supabase.ts
 *
 * Or use the service-role key for bypassing RLS:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... npx tsx scripts/seed-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import { MOCK_PHONES } from '../src/data';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(url, key);

const BATCH = 50;

async function seed() {
  console.log(`Seeding ${MOCK_PHONES.length} products…`);

  const rows = MOCK_PHONES.map(p => ({
    id: p.id,
    model: p.model,
    brand: p.brand,
    category: p.category,
    storage: p.storage ?? null,
    price: p.price,
    original_price: p.originalPrice,
    grade: p.grade,
    battery_health: p.batteryHealth ?? null,
    warranty_months: p.warrantyMonths,
    return_days: p.returnDays,
    image_url: p.imageUrl ?? null,
    gallery_images: p.galleryImages ?? null,
    is_certified: p.isCertified,
    stock: p.stock,
    specs: p.specs ?? null,
    description: p.description ?? null,
    condition_description: p.conditionDescription ?? null,
    color_options: p.colorOptions ?? null,
    storage_options: p.storageOptions ?? null,
    condition_options: p.conditionOptions ?? null,
  }));

  // Upsert in batches to avoid payload limits
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('products')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`Batch ${i / BATCH + 1} failed:`, error.message);
    } else {
      console.log(`  ✓ ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
    }
  }

  // Seed product variants
  const variantRows = MOCK_PHONES.flatMap(p =>
    (p.variants ?? []).map(v => ({
      id: v.id,
      product_id: p.id,
      color: v.color ?? null,
      storage: v.storage ?? null,
      condition: v.condition ?? null,
      price: v.price,
      original_price: v.originalPrice,
      stock: v.stock,
      battery_health: v.batteryHealth ?? null,
      image_url: v.imageUrl ?? null,
      gallery_images: v.galleryImages ?? null,
    }))
  );

  if (variantRows.length > 0) {
    console.log(`\nSeeding ${variantRows.length} variants…`);
    for (let i = 0; i < variantRows.length; i += BATCH) {
      const batch = variantRows.slice(i, i + BATCH);
      const { error } = await supabase
        .from('product_variants')
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        console.error(`Variant batch ${i / BATCH + 1} failed:`, error.message);
      } else {
        console.log(`  ✓ ${Math.min(i + BATCH, variantRows.length)} / ${variantRows.length}`);
      }
    }
  }

  console.log('\nDone.');
}

seed().catch(err => { console.error(err); process.exit(1); });
