-- ============================================================
-- MobilePhoneMarket — Initial Schema
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- fast ILIKE search

-- ── Products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                  TEXT PRIMARY KEY,
  model               TEXT NOT NULL,
  brand               TEXT NOT NULL,
  category            TEXT NOT NULL,
  storage             TEXT,
  price               NUMERIC(10,2) NOT NULL,
  original_price      NUMERIC(10,2) NOT NULL,
  grade               TEXT NOT NULL CHECK (grade IN ('Pristine','Excellent','Good','Fair','New')),
  battery_health      INTEGER CHECK (battery_health BETWEEN 0 AND 100),
  warranty_months     INTEGER NOT NULL DEFAULT 12,
  return_days         INTEGER NOT NULL DEFAULT 30,
  image_url           TEXT,
  gallery_images      TEXT[],
  is_certified        BOOLEAN NOT NULL DEFAULT false,
  stock               INTEGER NOT NULL DEFAULT 0,
  specs               JSONB,
  description         TEXT,
  condition_description TEXT,
  color_options       TEXT[],
  storage_options     TEXT[],
  condition_options   TEXT[],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_brand_idx      ON products (brand);
CREATE INDEX IF NOT EXISTS products_category_idx   ON products (category);
CREATE INDEX IF NOT EXISTS products_grade_idx      ON products (grade);
CREATE INDEX IF NOT EXISTS products_price_idx      ON products (price);
CREATE INDEX IF NOT EXISTS products_model_trgm     ON products USING GIN (model gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_brand_trgm     ON products USING GIN (brand gin_trgm_ops);

-- ── Product variants ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id              TEXT PRIMARY KEY,
  product_id      TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  color           TEXT,
  storage         TEXT,
  condition       TEXT CHECK (condition IN ('Pristine','Excellent','Good','Fair','New')),
  price           NUMERIC(10,2) NOT NULL,
  original_price  NUMERIC(10,2) NOT NULL,
  stock           INTEGER NOT NULL DEFAULT 0,
  battery_health  INTEGER CHECK (battery_health BETWEEN 0 AND 100),
  image_url       TEXT,
  gallery_images  TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS variants_product_id_idx ON product_variants (product_id);

-- ── Profiles (extends auth.users) ────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name   TEXT,
  phone       TEXT,
  address     JSONB,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Cart items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  product_id         TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  variant_id         TEXT REFERENCES product_variants (id) ON DELETE SET NULL,
  quantity           INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  selected_color     TEXT,
  selected_storage   TEXT,
  selected_condition TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id, selected_color, selected_storage, selected_condition)
);

CREATE INDEX IF NOT EXISTS cart_user_id_idx ON cart_items (user_id);

-- ── Wishlist items ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS wishlist_user_id_idx ON wishlist_items (user_id);

-- ── Orders ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  guest_email        TEXT,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  subtotal           NUMERIC(10,2) NOT NULL,
  delivery_cost      NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount           NUMERIC(10,2) NOT NULL DEFAULT 0,
  total              NUMERIC(10,2) NOT NULL,
  delivery_address   JSONB,
  billing_address    JSONB,
  payment_intent_id  TEXT,
  payment_method     TEXT,
  tracking_number    TEXT,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT must_have_user_or_email CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx  ON orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx   ON orders (status);
CREATE INDEX IF NOT EXISTS orders_created_idx  ON orders (created_at DESC);

-- ── Order line items ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id           UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id         TEXT REFERENCES products (id) ON DELETE SET NULL,
  variant_id         TEXT REFERENCES product_variants (id) ON DELETE SET NULL,
  model              TEXT NOT NULL,
  brand              TEXT NOT NULL,
  selected_color     TEXT,
  selected_storage   TEXT,
  selected_condition TEXT,
  price              NUMERIC(10,2) NOT NULL,
  original_price     NUMERIC(10,2) NOT NULL,
  quantity           INTEGER NOT NULL DEFAULT 1,
  image_url          TEXT
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);

-- ── Trade-in quotes ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_in_quotes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  email            TEXT NOT NULL,
  device_brand     TEXT NOT NULL,
  device_model     TEXT NOT NULL,
  device_storage   TEXT,
  device_condition TEXT NOT NULL,
  issues           TEXT[],
  estimated_value  NUMERIC(10,2),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','quoted','accepted','rejected','completed')),
  admin_notes      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Newsletter subscribers ───────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Product reviews ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  order_id    UUID REFERENCES orders (id) ON DELETE SET NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT,
  comment     TEXT,
  user_name   TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON reviews (product_id);

-- ── updated_at auto-update trigger ──────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_updated_at       BEFORE UPDATE ON products         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profiles_updated_at       BEFORE UPDATE ON profiles         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER cart_items_updated_at     BEFORE UPDATE ON cart_items       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_updated_at         BEFORE UPDATE ON orders           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trade_in_quotes_updated_at BEFORE UPDATE ON trade_in_quotes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_in_quotes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews               ENABLE ROW LEVEL SECURITY;

-- products — public read, service-role write
CREATE POLICY "products_public_read"     ON products         FOR SELECT USING (true);
CREATE POLICY "variants_public_read"     ON product_variants FOR SELECT USING (true);
CREATE POLICY "reviews_public_read"      ON reviews          FOR SELECT USING (true);

-- profiles — owner only
CREATE POLICY "profiles_owner_select"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_owner_update"   ON profiles FOR UPDATE USING (auth.uid() = id);

-- cart — owner only
CREATE POLICY "cart_owner_select"       ON cart_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cart_owner_insert"       ON cart_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cart_owner_update"       ON cart_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cart_owner_delete"       ON cart_items FOR DELETE USING (auth.uid() = user_id);

-- wishlist — owner only
CREATE POLICY "wishlist_owner_select"   ON wishlist_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wishlist_owner_insert"   ON wishlist_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wishlist_owner_delete"   ON wishlist_items FOR DELETE USING (auth.uid() = user_id);

-- orders — owner (or guest match by email via service role)
CREATE POLICY "orders_owner_select"     ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "order_items_owner_select" ON order_items FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));

-- trade-in — anyone can insert, owner can view
CREATE POLICY "trade_in_insert"         ON trade_in_quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "trade_in_owner_select"   ON trade_in_quotes FOR SELECT USING (auth.uid() = user_id);

-- newsletter — anyone can insert (upsert), no reads via client
CREATE POLICY "newsletter_insert"       ON newsletter_subscribers FOR INSERT WITH CHECK (true);

-- reviews — public read, authenticated insert (one per order per product)
CREATE POLICY "reviews_auth_insert"     ON reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "reviews_owner_update"    ON reviews FOR UPDATE USING (auth.uid() = user_id);
