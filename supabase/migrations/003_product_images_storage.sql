-- ============================================================
-- alcentimo-1 — Bucket de imágenes de productos
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lectura pública (catálogo)
DROP POLICY IF EXISTS "public_read_product_images" ON storage.objects;
CREATE POLICY "public_read_product_images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

-- Miembros de tienda pueden subir a su carpeta {store_id}/...
DROP POLICY IF EXISTS "store_members_upload_product_images" ON storage.objects;
CREATE POLICY "store_members_upload_product_images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_member_of_store(((storage.foldername(name))[1])::uuid)
  );

-- Miembros pueden actualizar/eliminar sus archivos
DROP POLICY IF EXISTS "store_members_update_product_images" ON storage.objects;
CREATE POLICY "store_members_update_product_images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_member_of_store(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "store_members_delete_product_images" ON storage.objects;
CREATE POLICY "store_members_delete_product_images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_member_of_store(((storage.foldername(name))[1])::uuid)
  );
