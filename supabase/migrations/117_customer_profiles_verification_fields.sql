-- Campos de verificación anti-fraude en registro de clientes por tienda.

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS document_id TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS social_url TEXT;

ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_document_id_length;
ALTER TABLE public.customer_profiles
  ADD CONSTRAINT customer_profiles_document_id_length
  CHECK (
    document_id IS NULL
    OR char_length(trim(document_id)) BETWEEN 5 AND 32
  );

ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_business_name_length;
ALTER TABLE public.customer_profiles
  ADD CONSTRAINT customer_profiles_business_name_length
  CHECK (
    business_name IS NULL
    OR char_length(trim(business_name)) BETWEEN 2 AND 120
  );

ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_city_length;
ALTER TABLE public.customer_profiles
  ADD CONSTRAINT customer_profiles_city_length
  CHECK (
    city IS NULL
    OR char_length(trim(city)) BETWEEN 2 AND 80
  );

ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_state_length;
ALTER TABLE public.customer_profiles
  ADD CONSTRAINT customer_profiles_state_length
  CHECK (
    state IS NULL
    OR char_length(trim(state)) BETWEEN 2 AND 80
  );

ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_social_url_length;
ALTER TABLE public.customer_profiles
  ADD CONSTRAINT customer_profiles_social_url_length
  CHECK (
    social_url IS NULL
    OR char_length(trim(social_url)) BETWEEN 2 AND 200
  );

COMMENT ON COLUMN public.customer_profiles.document_id IS
  'Cédula de identidad o RIF del cliente (verificación anti-fraude).';
COMMENT ON COLUMN public.customer_profiles.business_name IS
  'Nombre de la tienda o negocio del cliente.';
COMMENT ON COLUMN public.customer_profiles.city IS
  'Ciudad del cliente.';
COMMENT ON COLUMN public.customer_profiles.state IS
  'Estado / región del cliente.';
COMMENT ON COLUMN public.customer_profiles.social_url IS
  'Enlace de Instagram u otro perfil comercial.';
