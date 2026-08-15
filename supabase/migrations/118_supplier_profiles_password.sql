-- Perfiles + credenciales de proveedores / mayoristas.
-- Idempotente: crea la tabla si falta (p. ej. si 116 no se aplicó) y luego password_hash.

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

DROP POLICY IF EXISTS supplier_profiles_select_own ON public.supplier_profiles;
CREATE POLICY supplier_profiles_select_own
  ON public.supplier_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Credenciales propias del panel mayorista (independientes de clientes/tiendas).
ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN public.supplier_profiles.password_hash IS
  'Hash scrypt de la contraseña del panel /proveedor. Aislada de auth.users de clientes/tiendas.';

-- Normaliza correos antes del índice único.
UPDATE public.supplier_profiles
SET email = lower(trim(email))
WHERE email IS DISTINCT FROM lower(trim(email));

-- Un correo = una cuenta de proveedor (login aislado).
CREATE UNIQUE INDEX IF NOT EXISTS supplier_profiles_email_unique_idx
  ON public.supplier_profiles (lower(email));
