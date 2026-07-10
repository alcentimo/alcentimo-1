-- ============================================================
-- alcentimo-1 — Configuración de tienda (envío, pagos, promos)
-- Ejecutar DESPUÉS de 002_stores_multi_tenancy.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS store_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  config      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT store_settings_store_unique UNIQUE (store_id)
);

CREATE INDEX IF NOT EXISTS idx_store_settings_store ON store_settings (store_id);

DROP TRIGGER IF EXISTS trg_store_settings_updated_at ON store_settings;
CREATE TRIGGER trg_store_settings_updated_at
BEFORE UPDATE ON store_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_manage_store_settings" ON store_settings;

CREATE POLICY "members_manage_store_settings"
  ON store_settings FOR ALL
  TO authenticated
  USING (is_member_of_store(store_id))
  WITH CHECK (is_member_of_store(store_id));
