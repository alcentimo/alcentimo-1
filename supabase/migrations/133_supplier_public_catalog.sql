-- Vitrina pública por proveedor: interruptor y slug de enlace.

ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS show_public_catalog BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS public_catalog_slug TEXT;

COMMENT ON COLUMN public.supplier_profiles.show_public_catalog IS
  'Si es true, el proveedor tiene vitrina pública en /vitrina/{public_catalog_slug}.';

COMMENT ON COLUMN public.supplier_profiles.public_catalog_slug IS
  'Slug estable del enlace público de la vitrina del proveedor.';

CREATE UNIQUE INDEX IF NOT EXISTS supplier_profiles_public_catalog_slug_idx
  ON public.supplier_profiles (public_catalog_slug)
  WHERE public_catalog_slug IS NOT NULL;
