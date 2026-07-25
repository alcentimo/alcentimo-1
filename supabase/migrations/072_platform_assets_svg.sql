-- Permitir SVG en el bucket de assets globales de la plataforma.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
]::text[]
WHERE id = 'platform-assets';
