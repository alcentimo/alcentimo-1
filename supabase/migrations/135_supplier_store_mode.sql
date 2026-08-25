-- Modo tienda / dropshipper del proveedor: panel /dashboard además del hub mayorista.

ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS store_mode_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.supplier_profiles.store_mode_enabled IS
  'Si es true, el proveedor accede al panel de tienda (/dashboard) igual que un dropshipper, además del inventario mayorista.';

CREATE OR REPLACE FUNCTION public.ensure_supplier_store_mode_column()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  ALTER TABLE public.supplier_profiles
    ADD COLUMN IF NOT EXISTS store_mode_enabled BOOLEAN NOT NULL DEFAULT false;

  PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_supplier_store_mode_column() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_supplier_store_mode_column() TO service_role;

CREATE OR REPLACE FUNCTION public.admin_set_supplier_store_mode(
  p_user_id UUID,
  p_enabled BOOLEAN
)
RETURNS TABLE (
  user_id UUID,
  store_mode_enabled BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_supplier_store_mode_column();

  UPDATE public.supplier_profiles
  SET
    store_mode_enabled = COALESCE(p_enabled, false),
    updated_at = now()
  WHERE supplier_profiles.user_id = p_user_id;

  RETURN QUERY
  SELECT
    supplier_profiles.user_id,
    supplier_profiles.store_mode_enabled
  FROM public.supplier_profiles
  WHERE supplier_profiles.user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_supplier_store_mode(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_supplier_store_mode(UUID, BOOLEAN) TO service_role;
