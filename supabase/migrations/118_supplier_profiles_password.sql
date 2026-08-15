-- Credenciales propias del panel mayorista (independientes de clientes/tiendas).
ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN public.supplier_profiles.password_hash IS
  'Hash scrypt de la contraseña del panel /proveedor. Aislada de auth.users de clientes/tiendas.';

-- Un correo = una cuenta de proveedor (login aislado).
CREATE UNIQUE INDEX IF NOT EXISTS supplier_profiles_email_unique_idx
  ON public.supplier_profiles (lower(email));
