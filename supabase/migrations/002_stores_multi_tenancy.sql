-- ============================================================
-- alcentimo-1 — Multi-tenancy: stores + RLS por tienda
-- Ejecutar DESPUÉS de 001_core_catalog_schema.sql
--
-- CORRECCIÓN v3: DROP VIEW antes de recrear (evita ERROR 42P16 al cambiar columnas).
-- ============================================================

-- ============================================================
-- 1. TABLA STORES
-- ============================================================
CREATE TABLE IF NOT EXISTS stores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  description   TEXT,
  logo_url      TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT stores_slug_unique UNIQUE (slug),
  CONSTRAINT stores_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE INDEX IF NOT EXISTS idx_stores_owner  ON stores (owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug   ON stores (slug) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores (is_active, updated_at DESC);

DROP TRIGGER IF EXISTS trg_stores_updated_at ON stores;
CREATE TRIGGER trg_stores_updated_at
BEFORE UPDATE ON stores
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. MIEMBROS DE TIENDA
-- ============================================================
CREATE TABLE IF NOT EXISTS store_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'staff'
               CHECK (role IN ('owner', 'admin', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT store_members_unique UNIQUE (store_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_store_members_user  ON store_members (user_id);
CREATE INDEX IF NOT EXISTS idx_store_members_store ON store_members (store_id);

CREATE OR REPLACE FUNCTION register_store_owner_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO store_members (store_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (store_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_register_store_owner ON stores;
CREATE TRIGGER trg_register_store_owner
AFTER INSERT ON stores
FOR EACH ROW EXECUTE FUNCTION register_store_owner_member();

-- ============================================================
-- 3. HELPERS RLS (sin depender de products.store_id aún)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_member_of_store(target_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM stores s
    WHERE s.id = target_store_id
      AND s.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM store_members sm
    WHERE sm.store_id = target_store_id
      AND sm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_store_admin(target_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM stores s
    WHERE s.id = target_store_id
      AND s.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM store_members sm
    WHERE sm.store_id = target_store_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_store_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM stores s
  WHERE s.owner_id = auth.uid()
  UNION
  SELECT sm.store_id
  FROM store_members sm
  WHERE sm.user_id = auth.uid();
$$;

-- ============================================================
-- 4. AÑADIR store_id (PRIMERO las columnas, luego las funciones)
-- ============================================================
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE exchange_rate
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- ============================================================
-- 5. BACKFILL de datos existentes
-- ============================================================
DO $$
DECLARE
  v_legacy_store_id UUID;
  v_owner_id        UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'store_id'
  ) AND (
    EXISTS (SELECT 1 FROM products WHERE store_id IS NULL)
    OR EXISTS (SELECT 1 FROM categories WHERE store_id IS NULL)
  ) THEN
    SELECT id INTO v_owner_id FROM auth.users ORDER BY created_at LIMIT 1;

    IF v_owner_id IS NOT NULL THEN
      INSERT INTO stores (owner_id, name, slug, description)
      VALUES (
        v_owner_id,
        'Tienda Legacy',
        'tienda-legacy',
        'Tienda auto-generada durante migración multi-tenant'
      )
      ON CONFLICT (slug) DO NOTHING
      RETURNING id INTO v_legacy_store_id;

      IF v_legacy_store_id IS NULL THEN
        SELECT id INTO v_legacy_store_id FROM stores WHERE slug = 'tienda-legacy';
      END IF;

      UPDATE categories SET store_id = v_legacy_store_id WHERE store_id IS NULL;
      UPDATE products    SET store_id = v_legacy_store_id WHERE store_id IS NULL;
    END IF;
  END IF;
END $$;

-- ============================================================
-- 6. CONSTRAINTS e índices por tienda
-- ============================================================
ALTER TABLE categories ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE products    ALTER COLUMN store_id SET NOT NULL;

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_slug_unique;
ALTER TABLE products    DROP CONSTRAINT IF EXISTS products_slug_unique;

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_store_slug_unique;
ALTER TABLE products    DROP CONSTRAINT IF EXISTS products_store_slug_unique;

ALTER TABLE categories
  ADD CONSTRAINT categories_store_slug_unique UNIQUE (store_id, slug);

ALTER TABLE products
  ADD CONSTRAINT products_store_slug_unique UNIQUE (store_id, slug);

ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_sku_unique;
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_product_sku_unique;

ALTER TABLE product_variants
  ADD CONSTRAINT product_variants_product_sku_unique UNIQUE (product_id, sku);

CREATE INDEX IF NOT EXISTS idx_categories_store ON categories (store_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_store   ON products (store_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_exchange_rate_store
  ON exchange_rate (store_id, effective_date DESC)
  WHERE store_id IS NOT NULL;

ALTER TABLE exchange_rate DROP CONSTRAINT IF EXISTS exchange_rate_one_per_day;

DROP INDEX IF EXISTS idx_exchange_rate_global_per_day;
DROP INDEX IF EXISTS idx_exchange_rate_store_per_day;

CREATE UNIQUE INDEX idx_exchange_rate_global_per_day
  ON exchange_rate (effective_date)
  WHERE store_id IS NULL;

CREATE UNIQUE INDEX idx_exchange_rate_store_per_day
  ON exchange_rate (store_id, effective_date)
  WHERE store_id IS NOT NULL;

-- ============================================================
-- 7. HELPERS que dependen de products.store_id (después del ALTER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.product_store_id(p_product_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT store_id FROM products WHERE id = p_product_id;
$$;

CREATE OR REPLACE FUNCTION public.variant_store_id(p_variant_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.store_id
  FROM product_variants v
  JOIN products p ON p.id = v.product_id
  WHERE v.id = p_variant_id;
$$;

-- ============================================================
-- 8. VISTAS DEL CATÁLOGO
-- ============================================================
DROP VIEW IF EXISTS catalog_list_view CASCADE;
DROP VIEW IF EXISTS catalog_product_detail_view CASCADE;

CREATE VIEW catalog_list_view AS
SELECT
  s.id                                          AS store_id,
  s.slug                                        AS store_slug,
  s.name                                        AS store_name,
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
JOIN stores s     ON s.id = p.store_id AND s.is_active = true
JOIN categories c ON c.id = p.category_id AND c.store_id = p.store_id
JOIN product_variants v
  ON v.product_id = p.id AND v.is_default = true AND v.is_active = true
LEFT JOIN product_prices pp
  ON pp.variant_id = v.id AND pp.effective_until IS NULL
LEFT JOIN product_images img
  ON img.product_id = p.id AND img.is_primary = true
WHERE p.is_active = true AND c.is_active = true;

CREATE VIEW catalog_product_detail_view AS
SELECT
  s.id   AS store_id,
  s.slug AS store_slug,
  s.name AS store_name,
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
JOIN stores s     ON s.id = p.store_id AND s.is_active = true
JOIN categories c ON c.id = p.category_id AND c.store_id = p.store_id
WHERE p.is_active = true;

-- ============================================================
-- 9. ELIMINAR POLÍTICAS RLS ANTIGUAS
-- ============================================================
DROP POLICY IF EXISTS "public_read_exchange_rate"  ON exchange_rate;
DROP POLICY IF EXISTS "public_read_categories"     ON categories;
DROP POLICY IF EXISTS "public_read_products"       ON products;
DROP POLICY IF EXISTS "public_read_variants"       ON product_variants;
DROP POLICY IF EXISTS "public_read_prices"         ON product_prices;
DROP POLICY IF EXISTS "public_read_images"         ON product_images;
DROP POLICY IF EXISTS "auth_write_exchange_rate"   ON exchange_rate;
DROP POLICY IF EXISTS "auth_write_categories"      ON categories;
DROP POLICY IF EXISTS "auth_write_products"        ON products;
DROP POLICY IF EXISTS "auth_write_variants"        ON product_variants;
DROP POLICY IF EXISTS "auth_write_prices"          ON product_prices;
DROP POLICY IF EXISTS "auth_write_images"          ON product_images;
DROP POLICY IF EXISTS "auth_write_inventory"       ON inventory_logs;
DROP POLICY IF EXISTS "auth_read_inventory"        ON inventory_logs;

-- Políticas nuevas (por si re-ejecutas)
DROP POLICY IF EXISTS "public_read_active_stores"        ON stores;
DROP POLICY IF EXISTS "members_read_own_stores"          ON stores;
DROP POLICY IF EXISTS "users_create_own_store"           ON stores;
DROP POLICY IF EXISTS "owners_update_store"              ON stores;
DROP POLICY IF EXISTS "owners_delete_store"              ON stores;
DROP POLICY IF EXISTS "members_read_store_team"          ON store_members;
DROP POLICY IF EXISTS "admins_manage_store_members"      ON store_members;
DROP POLICY IF EXISTS "members_manage_categories"        ON categories;
DROP POLICY IF EXISTS "members_read_own_products"        ON products;
DROP POLICY IF EXISTS "members_insert_products"          ON products;
DROP POLICY IF EXISTS "members_update_products"          ON products;
DROP POLICY IF EXISTS "members_delete_products"          ON products;
DROP POLICY IF EXISTS "members_manage_variants"          ON product_variants;
DROP POLICY IF EXISTS "members_manage_prices"            ON product_prices;
DROP POLICY IF EXISTS "members_manage_images"            ON product_images;
DROP POLICY IF EXISTS "members_read_inventory"           ON inventory_logs;
DROP POLICY IF EXISTS "members_insert_inventory"         ON inventory_logs;
DROP POLICY IF EXISTS "public_read_global_exchange_rate" ON exchange_rate;
DROP POLICY IF EXISTS "members_read_store_exchange_rate" ON exchange_rate;
DROP POLICY IF EXISTS "admins_manage_store_exchange_rate" ON exchange_rate;

-- ============================================================
-- 10. RLS — STORES & STORE_MEMBERS
-- ============================================================
ALTER TABLE stores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_active_stores"
  ON stores FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "members_read_own_stores"
  ON stores FOR SELECT
  TO authenticated
  USING (is_member_of_store(id));

CREATE POLICY "users_create_own_store"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owners_update_store"
  ON stores FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owners_delete_store"
  ON stores FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "members_read_store_team"
  ON store_members FOR SELECT
  TO authenticated
  USING (is_member_of_store(store_id));

CREATE POLICY "admins_manage_store_members"
  ON store_members FOR ALL
  TO authenticated
  USING (is_store_admin(store_id))
  WITH CHECK (is_store_admin(store_id));

-- ============================================================
-- 11. RLS — CATEGORIES
-- ============================================================
CREATE POLICY "public_read_categories"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = categories.store_id AND s.is_active = true
    )
  );

CREATE POLICY "members_manage_categories"
  ON categories FOR ALL
  TO authenticated
  USING (is_member_of_store(store_id))
  WITH CHECK (is_member_of_store(store_id));

-- ============================================================
-- 12. RLS — PRODUCTS
-- ============================================================
CREATE POLICY "public_read_products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = products.store_id AND s.is_active = true
    )
  );

CREATE POLICY "members_read_own_products"
  ON products FOR SELECT
  TO authenticated
  USING (is_member_of_store(store_id));

CREATE POLICY "members_insert_products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (is_member_of_store(store_id));

CREATE POLICY "members_update_products"
  ON products FOR UPDATE
  TO authenticated
  USING (is_member_of_store(store_id))
  WITH CHECK (is_member_of_store(store_id));

CREATE POLICY "members_delete_products"
  ON products FOR DELETE
  TO authenticated
  USING (is_member_of_store(store_id));

-- ============================================================
-- 13. RLS — VARIANTS, PRICES, IMAGES
-- ============================================================
CREATE POLICY "public_read_variants"
  ON product_variants FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = product_variants.product_id
        AND p.is_active = true
        AND s.is_active = true
    )
  );

CREATE POLICY "members_manage_variants"
  ON product_variants FOR ALL
  TO authenticated
  USING (is_member_of_store(product_store_id(product_id)))
  WITH CHECK (is_member_of_store(product_store_id(product_id)));

CREATE POLICY "public_read_prices"
  ON product_prices FOR SELECT
  TO anon, authenticated
  USING (
    effective_until IS NULL
    AND EXISTS (
      SELECT 1 FROM product_variants v
      JOIN products p ON p.id = v.product_id
      JOIN stores s ON s.id = p.store_id
      WHERE v.id = product_prices.variant_id
        AND v.is_active = true
        AND p.is_active = true
        AND s.is_active = true
    )
  );

CREATE POLICY "members_manage_prices"
  ON product_prices FOR ALL
  TO authenticated
  USING (is_member_of_store(variant_store_id(variant_id)))
  WITH CHECK (is_member_of_store(variant_store_id(variant_id)));

CREATE POLICY "public_read_images"
  ON product_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.id = product_images.product_id
        AND p.is_active = true
        AND s.is_active = true
    )
  );

CREATE POLICY "members_manage_images"
  ON product_images FOR ALL
  TO authenticated
  USING (is_member_of_store(product_store_id(product_id)))
  WITH CHECK (is_member_of_store(product_store_id(product_id)));

-- ============================================================
-- 14. RLS — INVENTORY LOGS
-- ============================================================
CREATE POLICY "members_read_inventory"
  ON inventory_logs FOR SELECT
  TO authenticated
  USING (is_member_of_store(variant_store_id(variant_id)));

CREATE POLICY "members_insert_inventory"
  ON inventory_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_member_of_store(variant_store_id(variant_id)));

-- ============================================================
-- 15. RLS — EXCHANGE RATE
-- ============================================================
CREATE POLICY "public_read_global_exchange_rate"
  ON exchange_rate FOR SELECT
  TO anon, authenticated
  USING (store_id IS NULL);

CREATE POLICY "members_read_store_exchange_rate"
  ON exchange_rate FOR SELECT
  TO authenticated
  USING (
    store_id IS NOT NULL
    AND is_member_of_store(store_id)
  );

CREATE POLICY "admins_manage_store_exchange_rate"
  ON exchange_rate FOR ALL
  TO authenticated
  USING (
    store_id IS NOT NULL
    AND is_store_admin(store_id)
  )
  WITH CHECK (
    store_id IS NOT NULL
    AND is_store_admin(store_id)
  );

-- ============================================================
-- 16. GRANTS PARA VISTAS
-- ============================================================
GRANT SELECT ON catalog_list_view TO anon, authenticated;
GRANT SELECT ON catalog_product_detail_view TO anon, authenticated;
