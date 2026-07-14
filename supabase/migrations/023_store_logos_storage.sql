-- ============================================================
-- alcentimo-1 — Logos de tienda (store-logos)
-- Ejecutar DESPUÉS de 016_store_payment_assets.sql
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-logos',
  'store-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_store_logos" ON storage.objects;
CREATE POLICY "public_read_store_logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'store-logos');

DROP POLICY IF EXISTS "store_members_upload_store_logos" ON storage.objects;
CREATE POLICY "store_members_upload_store_logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'store-logos'
    AND public.is_member_of_store(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "store_members_update_store_logos" ON storage.objects;
CREATE POLICY "store_members_update_store_logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'store-logos'
    AND public.is_member_of_store(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "store_members_delete_store_logos" ON storage.objects;
CREATE POLICY "store_members_delete_store_logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'store-logos'
    AND public.is_member_of_store(((storage.foldername(name))[1])::uuid)
  );
