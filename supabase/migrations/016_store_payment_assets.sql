-- ============================================================
-- alcentimo-1 — Assets de configuración de tienda (QR Pago Móvil, etc.)
-- Ejecutar DESPUÉS de 003_product_images_storage.sql
--
-- NOTA: Los métodos de pago (paypal, binance, crypto, qrImageUrl)
-- se guardan en store_settings.config (JSONB). No requiere columnas nuevas.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-assets',
  'store-assets',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_store_assets" ON storage.objects;
CREATE POLICY "public_read_store_assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'store-assets');

DROP POLICY IF EXISTS "store_members_upload_store_assets" ON storage.objects;
CREATE POLICY "store_members_upload_store_assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'store-assets'
    AND public.is_member_of_store(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "store_members_update_store_assets" ON storage.objects;
CREATE POLICY "store_members_update_store_assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'store-assets'
    AND public.is_member_of_store(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "store_members_delete_store_assets" ON storage.objects;
CREATE POLICY "store_members_delete_store_assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'store-assets'
    AND public.is_member_of_store(((storage.foldername(name))[1])::uuid)
  );

COMMENT ON TABLE public.store_settings IS
  'Config JSONB por tienda: shipping, payments (incl. qrImageUrl, paypal, binance, crypto), promotions, contact.';
