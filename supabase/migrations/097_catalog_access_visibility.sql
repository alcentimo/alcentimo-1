-- Acceso al catálogo: modo de visibilidad + secreto de contraseña (no público).

CREATE TABLE IF NOT EXISTS public.store_catalog_secrets (
  store_id UUID PRIMARY KEY REFERENCES public.stores (id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.store_catalog_secrets IS
  'Hash de contraseña del catálogo protegido. Sin lectura anon/authenticated vía RLS.';

ALTER TABLE public.store_catalog_secrets ENABLE ROW LEVEL SECURITY;

-- Sin policies para anon/authenticated: solo service_role (acciones server).

-- Columna denormalizada en stores para filtros/SEO rápidos (modo no es secreto).
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS catalog_access_mode TEXT NOT NULL DEFAULT 'public';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'stores_catalog_access_mode_check'
  ) THEN
    ALTER TABLE public.stores
      ADD CONSTRAINT stores_catalog_access_mode_check
      CHECK (
        catalog_access_mode IN ('public', 'draft', 'private', 'password')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS stores_catalog_access_mode_idx
  ON public.stores (catalog_access_mode)
  WHERE is_active = true;

COMMENT ON COLUMN public.stores.catalog_access_mode IS
  'Visibilidad del catálogo público: public | draft | private | password.';
