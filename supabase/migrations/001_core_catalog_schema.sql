-- ============================================================
-- alcentimo-1 — Esquema core del catálogo digital
-- Ejecutar en Supabase SQL Editor o via CLI
--
-- Decisiones:
--   • Un solo almacén (sin tabla warehouses)
--   • Precio USD como fuente de verdad; Bs = USD × tasa del día
--   • reserved_quantity para stock comprometido
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TIPOS
-- ============================================================
CREATE TYPE inventory_movement_type AS ENUM (
  'purchase_in',
  'sale_out',
  'adjustment',
  'return_in',
  'damage_out',
  'reserve',       -- compromete stock (reserved_quantity ↑)
  'release'        -- libera reserva (reserved_quantity ↓)
);

-- ============================================================
-- TASA DE CAMBIO DEL DÍA (USD → VES)
-- ============================================================
CREATE TABLE exchange_rate (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate            NUMERIC(18, 6) NOT NULL CHECK (rate > 0),
  source          TEXT NOT NULL DEFAULT 'manual',  -- 'bcv', 'manual', 'parallel'
  effective_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT exchange_rate_one_per_day UNIQUE (effective_date)
);

CREATE INDEX idx_exchange_rate_date ON exchange_rate (effective_date DESC);

-- Tasa vigente: la del día actual, o la más reciente si aún no hay una hoy
CREATE OR REPLACE FUNCTION get_current_exchange_rate()
RETURNS NUMERIC(18, 6)
LANGUAGE sql
STABLE
AS $$
  SELECT rate
  FROM exchange_rate
  ORDER BY effective_date DESC
  LIMIT 1;
$$;

-- ============================================================
-- CATEGORÍAS (jerarquía profunda, un solo almacén implícito)
-- ============================================================
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  depth       SMALLINT NOT NULL DEFAULT 0,
  path        TEXT NOT NULL DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT categories_slug_unique UNIQUE (slug),
  CONSTRAINT categories_no_self_parent CHECK (id <> parent_id)
);

CREATE INDEX idx_categories_parent ON categories (parent_id) WHERE is_active = true;
CREATE INDEX idx_categories_path   ON categories (path) WHERE is_active = true;

-- ============================================================
-- PRODUCTOS
-- ============================================================
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  description       TEXT,
  short_description TEXT,
  brand             TEXT,
  tags              TEXT[] NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  metadata          JSONB NOT NULL DEFAULT '{}',
  search_vector     TSVECTOR GENERATED ALWAYS AS (
    to_tsvector(
      'spanish',
      coalesce(name, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(brand, '')
    )
  ) STORED,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT products_slug_unique UNIQUE (slug)
);

CREATE INDEX idx_products_category ON products (category_id) WHERE is_active = true;
CREATE INDEX idx_products_featured  ON products (is_featured, updated_at DESC) WHERE is_active = true;
CREATE INDEX idx_products_search    ON products USING GIN (search_vector);
CREATE INDEX idx_products_tags      ON products USING GIN (tags);
CREATE INDEX idx_products_sync      ON products (updated_at DESC) WHERE is_active = true;

-- ============================================================
-- VARIANTES (unidad vendible + stock + reservas)
-- ============================================================
CREATE TABLE product_variants (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku                  TEXT NOT NULL,
  name                 TEXT,
  attributes           JSONB NOT NULL DEFAULT '{}',
  barcode              TEXT,
  stock_quantity       INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity    INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  low_stock_threshold  INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  weight_grams         INTEGER,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  is_default           BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT product_variants_sku_unique UNIQUE (sku),
  CONSTRAINT product_variants_reserved_lte_stock
    CHECK (reserved_quantity <= stock_quantity)
);

CREATE INDEX idx_variants_product   ON product_variants (product_id) WHERE is_active = true;
CREATE INDEX idx_variants_available ON product_variants ((stock_quantity - reserved_quantity))
  WHERE is_active = true;
CREATE INDEX idx_variants_attrs     ON product_variants USING GIN (attributes);
CREATE INDEX idx_variants_sync      ON product_variants (updated_at DESC) WHERE is_active = true;

CREATE UNIQUE INDEX idx_variants_one_default
  ON product_variants (product_id)
  WHERE is_default = true;

-- Stock disponible para venta
CREATE OR REPLACE FUNCTION variant_available_stock(p_variant_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT stock_quantity - reserved_quantity
  FROM product_variants
  WHERE id = p_variant_id;
$$;

-- ============================================================
-- PRECIOS (solo USD — Bs se calcula en lectura)
-- ============================================================
CREATE TABLE product_prices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id        UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  amount_usd        NUMERIC(18, 4) NOT NULL CHECK (amount_usd >= 0),
  compare_at_usd    NUMERIC(18, 4) CHECK (compare_at_usd IS NULL OR compare_at_usd >= 0),
  effective_from    TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT product_prices_effective_range
    CHECK (effective_until IS NULL OR effective_until > effective_from)
);

CREATE UNIQUE INDEX idx_prices_current_unique
  ON product_prices (variant_id)
  WHERE effective_until IS NULL;

CREATE INDEX idx_prices_variant ON product_prices (variant_id, effective_from DESC);

-- Precio en Bs calculado al vuelo
CREATE OR REPLACE FUNCTION price_in_ves(p_amount_usd NUMERIC)
RETURNS NUMERIC(18, 4)
LANGUAGE sql
STABLE
AS $$
  SELECT ROUND(p_amount_usd * get_current_exchange_rate(), 4);
$$;

-- ============================================================
-- IMÁGENES (carga incremental: thumb → medium → full)
-- ============================================================
CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id  UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  thumb_url   TEXT NOT NULL,
  medium_url  TEXT,
  full_url    TEXT,
  blur_hash   TEXT,
  alt_text    TEXT,
  width       SMALLINT,
  height      SMALLINT,
  byte_size   INTEGER,
  mime_type   TEXT NOT NULL DEFAULT 'image/webp',
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_images_product ON product_images (product_id, sort_order);

CREATE UNIQUE INDEX idx_images_one_primary
  ON product_images (product_id)
  WHERE is_primary = true;

-- ============================================================
-- LOGS DE INVENTARIO
-- ============================================================
CREATE TABLE inventory_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id       UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  movement_type    inventory_movement_type NOT NULL,
  quantity_change  INTEGER NOT NULL CHECK (quantity_change <> 0),
  quantity_before  INTEGER NOT NULL CHECK (quantity_before >= 0),
  quantity_after   INTEGER NOT NULL CHECK (quantity_after >= 0),
  reserved_before  INTEGER NOT NULL DEFAULT 0 CHECK (reserved_before >= 0),
  reserved_after   INTEGER NOT NULL DEFAULT 0 CHECK (reserved_after >= 0),
  unit_cost_usd    NUMERIC(18, 4),
  exchange_rate    NUMERIC(18, 6),   -- tasa vigente al momento del movimiento
  reference_type   TEXT,
  reference_id     UUID,
  notes            TEXT,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT inventory_logs_stock_consistency
    CHECK (quantity_after = quantity_before + quantity_change)
);

CREATE INDEX idx_inventory_variant_date ON inventory_logs (variant_id, created_at DESC);
CREATE INDEX idx_inventory_reference    ON inventory_logs (reference_type, reference_id)
  WHERE reference_id IS NOT NULL;

-- ============================================================
-- TRIGGER: aplicar movimientos de stock físico
-- ============================================================
CREATE OR REPLACE FUNCTION apply_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_stock    INTEGER;
  v_reserved INTEGER;
BEGIN
  SELECT stock_quantity, reserved_quantity
  INTO v_stock, v_reserved
  FROM product_variants
  WHERE id = NEW.variant_id
  FOR UPDATE;

  NEW.quantity_before := v_stock;
  NEW.reserved_before := v_reserved;
  NEW.exchange_rate   := COALESCE(NEW.exchange_rate, get_current_exchange_rate());

  CASE NEW.movement_type
    WHEN 'reserve' THEN
      IF v_stock - v_reserved + NEW.quantity_change < 0 THEN
        RAISE EXCEPTION 'Stock disponible insuficiente para reservar en variante %', NEW.variant_id;
      END IF;
      NEW.reserved_after := v_reserved + ABS(NEW.quantity_change);
      NEW.quantity_after := v_stock;
      NEW.quantity_change := 0;

      UPDATE product_variants
      SET reserved_quantity = NEW.reserved_after, updated_at = now()
      WHERE id = NEW.variant_id;

    WHEN 'release' THEN
      IF v_reserved + NEW.quantity_change < 0 THEN
        RAISE EXCEPTION 'Reserva insuficiente para liberar en variante %', NEW.variant_id;
      END IF;
      NEW.reserved_after := v_reserved + NEW.quantity_change; -- quantity_change negativo
      NEW.quantity_after := v_stock;
      NEW.quantity_change := 0;

      UPDATE product_variants
      SET reserved_quantity = NEW.reserved_after, updated_at = now()
      WHERE id = NEW.variant_id;

    ELSE
      -- Movimientos físicos: purchase_in, sale_out, adjustment, return_in, damage_out
      NEW.quantity_after := v_stock + NEW.quantity_change;
      NEW.reserved_after := v_reserved;

      IF NEW.quantity_after < 0 THEN
        RAISE EXCEPTION 'Stock insuficiente en variante %', NEW.variant_id;
      END IF;
      IF NEW.reserved_after > NEW.quantity_after THEN
        RAISE EXCEPTION 'La reserva (%) supera el stock (%) en variante %',
          NEW.reserved_after, NEW.quantity_after, NEW.variant_id;
      END IF;

      UPDATE product_variants
      SET stock_quantity = NEW.quantity_after, updated_at = now()
      WHERE id = NEW.variant_id;
  END CASE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_inventory_movement
BEFORE INSERT ON inventory_logs
FOR EACH ROW EXECUTE FUNCTION apply_inventory_movement();

-- ============================================================
-- TRIGGER: jerarquía de categorías
-- ============================================================
CREATE OR REPLACE FUNCTION update_category_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_parent_path  TEXT;
  v_parent_depth SMALLINT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.depth := 0;
    NEW.path  := NEW.slug;
  ELSE
    SELECT path, depth INTO v_parent_path, v_parent_depth
    FROM categories WHERE id = NEW.parent_id;

    NEW.depth := v_parent_depth + 1;
    NEW.path  := v_parent_path || '/' || NEW.slug;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_category_hierarchy
BEFORE INSERT OR UPDATE OF parent_id, slug ON categories
FOR EACH ROW EXECUTE FUNCTION update_category_hierarchy();

-- ============================================================
-- TRIGGER: updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_variants_updated_at
BEFORE UPDATE ON product_variants
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- VISTAS DE LECTURA RÁPIDA
-- ============================================================

-- Grid del catálogo: payload mínimo para móvil
CREATE OR REPLACE VIEW catalog_list_view AS
SELECT
  p.id                                          AS product_id,
  p.slug                                        AS product_slug,
  p.name                                        AS product_name,
  p.short_description,
  p.brand,
  p.is_featured,
  p.updated_at,
  c.id                                          AS category_id,
  c.name                                        AS category_name,
  c.slug                                        AS category_slug,
  c.path                                        AS category_path,
  v.id                                          AS default_variant_id,
  v.sku                                         AS default_sku,
  v.stock_quantity,
  v.reserved_quantity,
  (v.stock_quantity - v.reserved_quantity)       AS available_stock,
  v.attributes                                  AS default_attributes,
  pp.amount_usd                                 AS price_usd,
  price_in_ves(pp.amount_usd)                   AS price_ves,
  pp.compare_at_usd                             AS compare_at_usd,
  price_in_ves(pp.compare_at_usd)               AS compare_at_ves,
  get_current_exchange_rate()                   AS exchange_rate_used,
  img.thumb_url,
  img.blur_hash,
  img.alt_text                                  AS image_alt
FROM products p
JOIN categories c ON c.id = p.category_id
JOIN product_variants v
  ON v.product_id = p.id AND v.is_default = true AND v.is_active = true
LEFT JOIN product_prices pp
  ON pp.variant_id = v.id AND pp.effective_until IS NULL
LEFT JOIN product_images img
  ON img.product_id = p.id AND img.is_primary = true
WHERE p.is_active = true AND c.is_active = true;

-- Detalle de producto con todas las variantes
CREATE OR REPLACE VIEW catalog_product_detail_view AS
SELECT
  p.id,
  p.slug,
  p.name,
  p.description,
  p.short_description,
  p.brand,
  p.tags,
  p.is_featured,
  p.metadata,
  p.updated_at,
  c.id   AS category_id,
  c.name AS category_name,
  c.slug AS category_slug,
  c.path AS category_path,
  get_current_exchange_rate() AS exchange_rate_used,
  (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', v.id,
      'sku', v.sku,
      'name', v.name,
      'attributes', v.attributes,
      'stock_quantity', v.stock_quantity,
      'reserved_quantity', v.reserved_quantity,
      'available_stock', v.stock_quantity - v.reserved_quantity,
      'is_default', v.is_default,
      'price_usd', pp.amount_usd,
      'price_ves', price_in_ves(pp.amount_usd),
      'compare_at_usd', pp.compare_at_usd,
      'compare_at_ves', price_in_ves(pp.compare_at_usd)
    ) ORDER BY v.is_default DESC, v.sku), '[]'::jsonb)
    FROM product_variants v
    LEFT JOIN product_prices pp
      ON pp.variant_id = v.id AND pp.effective_until IS NULL
    WHERE v.product_id = p.id AND v.is_active = true
  ) AS variants,
  (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', pi.id,
      'thumb_url', pi.thumb_url,
      'medium_url', pi.medium_url,
      'full_url', pi.full_url,
      'blur_hash', pi.blur_hash,
      'sort_order', pi.sort_order,
      'is_primary', pi.is_primary
    ) ORDER BY pi.sort_order), '[]'::jsonb)
    FROM product_images pi
    WHERE pi.product_id = p.id
  ) AS images
FROM products p
JOIN categories c ON c.id = p.category_id
WHERE p.is_active = true;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE exchange_rate      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_prices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs     ENABLE ROW LEVEL SECURITY;

-- Lectura pública del catálogo (anon + authenticated)
CREATE POLICY "public_read_exchange_rate"
  ON exchange_rate FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "public_read_categories"
  ON categories FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "public_read_products"
  ON products FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "public_read_variants"
  ON product_variants FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "public_read_prices"
  ON product_prices FOR SELECT TO anon, authenticated USING (effective_until IS NULL);

CREATE POLICY "public_read_images"
  ON product_images FOR SELECT TO anon, authenticated USING (true);

-- Escritura restringida a usuarios autenticados (refinar con roles después)
CREATE POLICY "auth_write_exchange_rate"
  ON exchange_rate FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_write_categories"
  ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_write_products"
  ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_write_variants"
  ON product_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_write_prices"
  ON product_prices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_write_images"
  ON product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_write_inventory"
  ON inventory_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_read_inventory"
  ON inventory_logs FOR SELECT TO authenticated USING (true);

-- ============================================================
-- DATOS INICIALES
-- ============================================================
INSERT INTO exchange_rate (rate, source, effective_date, notes)
VALUES (36.50, 'manual', CURRENT_DATE, 'Tasa inicial — actualizar diariamente');
