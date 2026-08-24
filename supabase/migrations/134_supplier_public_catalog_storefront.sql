-- Reaplica columnas de vitrina pública (133) + identidad/pagos/envíos del proveedor.
-- Incluye RPC para el interruptor admin aunque el schema cache de PostgREST esté desfasado.

ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS show_public_catalog BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS public_catalog_slug TEXT;

ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS trade_name TEXT;

ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS public_description TEXT;

ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS storefront_config JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.supplier_profiles.show_public_catalog IS
  'Si es true, el proveedor tiene vitrina pública en /vitrina/{public_catalog_slug}.';

COMMENT ON COLUMN public.supplier_profiles.public_catalog_slug IS
  'Slug estable del enlace público de la vitrina del proveedor.';

COMMENT ON COLUMN public.supplier_profiles.trade_name IS
  'Nombre comercial mostrado en la vitrina pública.';

COMMENT ON COLUMN public.supplier_profiles.logo_url IS
  'Logotipo de la vitrina pública del proveedor.';

COMMENT ON COLUMN public.supplier_profiles.public_description IS
  'Descripción corta de la marca en la vitrina pública.';

COMMENT ON COLUMN public.supplier_profiles.storefront_config IS
  'Pagos y envíos de la vitrina pública del proveedor (JSON).';

CREATE UNIQUE INDEX IF NOT EXISTS supplier_profiles_public_catalog_slug_idx
  ON public.supplier_profiles (public_catalog_slug)
  WHERE public_catalog_slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ensure_supplier_public_catalog_columns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ALTER TABLE public.supplier_profiles
    ADD COLUMN IF NOT EXISTS show_public_catalog BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE public.supplier_profiles
    ADD COLUMN IF NOT EXISTS public_catalog_slug TEXT;
  ALTER TABLE public.supplier_profiles
    ADD COLUMN IF NOT EXISTS trade_name TEXT;
  ALTER TABLE public.supplier_profiles
    ADD COLUMN IF NOT EXISTS logo_url TEXT;
  ALTER TABLE public.supplier_profiles
    ADD COLUMN IF NOT EXISTS public_description TEXT;
  ALTER TABLE public.supplier_profiles
    ADD COLUMN IF NOT EXISTS storefront_config JSONB NOT NULL DEFAULT '{}'::jsonb;

  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS supplier_profiles_public_catalog_slug_idx
      ON public.supplier_profiles (public_catalog_slug)
      WHERE public_catalog_slug IS NOT NULL;
  EXCEPTION
    WHEN duplicate_table THEN
      NULL;
  END;

  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_supplier_public_catalog(
  p_user_id UUID,
  p_enabled BOOLEAN,
  p_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  show_public_catalog BOOLEAN,
  public_catalog_slug TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_slug TEXT;
BEGIN
  PERFORM public.ensure_supplier_public_catalog_columns();

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Proveedor inválido.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.supplier_profiles sp WHERE sp.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Proveedor no encontrado.';
  END IF;

  next_slug := NULLIF(lower(btrim(COALESCE(p_slug, ''))), '');

  UPDATE public.supplier_profiles sp
  SET
    show_public_catalog = p_enabled,
    public_catalog_slug = CASE
      WHEN p_enabled THEN COALESCE(next_slug, sp.public_catalog_slug)
      ELSE COALESCE(next_slug, sp.public_catalog_slug)
    END,
    updated_at = now()
  WHERE sp.user_id = p_user_id;

  RETURN QUERY
  SELECT
    sp.user_id,
    sp.show_public_catalog,
    sp.public_catalog_slug
  FROM public.supplier_profiles sp
  WHERE sp.user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_supplier_public_catalog_columns() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_supplier_public_catalog(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_supplier_public_catalog_columns() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_supplier_public_catalog(UUID, BOOLEAN, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
