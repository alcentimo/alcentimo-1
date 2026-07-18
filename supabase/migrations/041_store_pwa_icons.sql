-- ============================================================
-- alcentimo-1 — Iconos PWA generados desde el logo de tienda
-- Ejecutar DESPUÉS de 040_catalog_visits.sql
-- ============================================================

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS pwa_icon_192_url TEXT,
  ADD COLUMN IF NOT EXISTS pwa_icon_512_url TEXT;

COMMENT ON COLUMN public.stores.pwa_icon_192_url IS
  'Icono PWA 192×192 generado automáticamente al subir el logo.';

COMMENT ON COLUMN public.stores.pwa_icon_512_url IS
  'Icono PWA 512×512 generado automáticamente al subir el logo.';
