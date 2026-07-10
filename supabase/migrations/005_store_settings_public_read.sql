-- ============================================================
-- alcentimo-1 — Lectura pública de ajustes de tienda activa
-- Necesario para mostrar envío/pagos en el catálogo público
-- ============================================================

DROP POLICY IF EXISTS "public_read_store_settings_for_active_stores" ON store_settings;

CREATE POLICY "public_read_store_settings_for_active_stores"
  ON store_settings FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM stores s
      WHERE s.id = store_settings.store_id
        AND s.is_active = true
    )
  );
