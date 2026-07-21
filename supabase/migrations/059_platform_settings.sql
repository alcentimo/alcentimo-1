-- Configuración general de la plataforma (logo, nombre, contacto).

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  platform_name TEXT NOT NULL DEFAULT 'Alcentimo',
  tagline TEXT NOT NULL DEFAULT 'Inventario y catálogo digital',
  logo_url TEXT NULL,
  support_email TEXT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.platform_settings IS
  'Identidad y datos globales de Alcentimo (editables desde el panel superadmin).';
COMMENT ON COLUMN public.platform_settings.logo_url IS
  'URL pública del logo principal mostrado en login, panel y landing.';
COMMENT ON COLUMN public.platform_settings.tagline IS
  'Descripción corta usada en metadatos y pie de marca.';

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_settings_public_read ON public.platform_settings;
CREATE POLICY platform_settings_public_read
  ON public.platform_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Escritura solo vía service role (panel admin).

INSERT INTO public.platform_settings (id, platform_name, tagline)
VALUES ('default', 'Alcentimo', 'Inventario y catálogo digital')
ON CONFLICT (id) DO NOTHING;

-- Bucket para logo y assets globales de la plataforma.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'platform-assets',
  'platform-assets',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_platform_assets" ON storage.objects;
CREATE POLICY "public_read_platform_assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'platform-assets');
