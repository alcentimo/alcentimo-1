-- Dirección de entrega guardada por cliente/tienda para checkout más rápido.

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_delivery_address_length;

ALTER TABLE public.customer_profiles
  ADD CONSTRAINT customer_profiles_delivery_address_length
  CHECK (
    delivery_address IS NULL
    OR char_length(trim(delivery_address)) <= 320
  );

COMMENT ON COLUMN public.customer_profiles.delivery_address IS
  'Dirección de entrega preferida del cliente en esta tienda.';
