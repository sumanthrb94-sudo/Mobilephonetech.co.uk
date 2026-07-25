#!/usr/bin/env bash
#
# Apply the schema and seed data to a fresh Supabase project.
#
# Usage:
#   DATABASE_URL='postgresql://postgres:<url-encoded-password>@db.<ref>.supabase.co:5432/postgres' \
#     ./scripts/bootstrap-db.sh
#
# Reserved characters in the password must be percent-encoded (@ -> %40, : -> %3A,
# / -> %2F, # -> %23) or psql will misparse the URI.
#
# Both steps are safe to re-run: the migration uses CREATE TABLE IF NOT EXISTS and
# the seed uses ON CONFLICT DO UPDATE.

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set." >&2
  echo "Get it from: supabase.com -> your project -> Settings -> Database -> Connection string (URI)" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION="$ROOT/supabase/migrations/20260507000000_initial_schema.sql"
SEED="$ROOT/supabase/seed.sql"

for f in "$MIGRATION" "$SEED"; do
  [ -f "$f" ] || { echo "Missing $f" >&2; exit 1; }
done

# ON_ERROR_STOP makes psql exit non-zero on the first failed statement instead of
# plowing through and reporting success.
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --quiet)

echo "==> Applying schema"
"${PSQL[@]}" -f "$MIGRATION"

echo "==> Seeding inventory"
"${PSQL[@]}" -f "$SEED"

echo "==> Verifying"
"${PSQL[@]}" -At -c \
  "SELECT 'products=' || (SELECT count(*) FROM products)
        || ' variants=' || (SELECT count(*) FROM product_variants)
        || ' rls_on=' || (SELECT count(*) FROM pg_tables
                          WHERE schemaname='public' AND rowsecurity)"

count=$("${PSQL[@]}" -At -c "SELECT count(*) FROM products")
if [ "$count" -eq 0 ]; then
  echo "FAILED: products table is empty after seeding." >&2
  exit 1
fi

echo "Done. $count products live."
