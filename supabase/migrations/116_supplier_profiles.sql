-- Perfiles de proveedores / mayoristas (registro self-serve + acceso al hub).
CREATE TABLE IF NOT EXISTS public.supplier_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  product_category TEXT NOT NULL DEFAULT 'otros',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_profiles_email_idx
  ON public.supplier_profiles (lower(email));

CREATE INDEX IF NOT EXISTS supplier_profiles_status_idx
  ON public.supplier_profiles (status)
  WHERE status = 'active';

COMMENT ON TABLE public.supplier_profiles IS
  'Identidad de mayoristas/proveedores registrados. Acceso al hub /proveedor además de SUPPLIER_EMAILS.';

ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;

-- El usuario autenticado puede leer su propio perfil (middleware / gates).
DROP POLICY IF EXISTS supplier_profiles_select_own ON public.supplier_profiles;
CREATE POLICY supplier_profiles_select_own
  ON public.supplier_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Escrituras vía service_role en server actions (sin policies de insert/update para authenticated).
