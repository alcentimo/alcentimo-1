-- Agencia de encomienda y sucursal de destino en pedidos y preferencias del cliente.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_method TEXT,
  ADD COLUMN IF NOT EXISTS shipping_branch_code TEXT,
  ADD COLUMN IF NOT EXISTS shipping_branch_name TEXT,
  ADD COLUMN IF NOT EXISTS shipping_branch_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS preferred_shipping_method TEXT,
  ADD COLUMN IF NOT EXISTS preferred_shipping_branch_code TEXT,
  ADD COLUMN IF NOT EXISTS preferred_shipping_branch_name TEXT,
  ADD COLUMN IF NOT EXISTS preferred_shipping_branch_address TEXT;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_shipping_method_valid;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_shipping_method_valid
  CHECK (
    shipping_method IS NULL
    OR shipping_method IN (
      'mrw', 'tealca', 'zoom', 'domesa', 'libertyExpress', 'delivery', 'pickup'
    )
  );

ALTER TABLE public.customer_profiles
  DROP CONSTRAINT IF EXISTS customer_profiles_preferred_shipping_method_valid;

ALTER TABLE public.customer_profiles
  ADD CONSTRAINT customer_profiles_preferred_shipping_method_valid
  CHECK (
    preferred_shipping_method IS NULL
    OR preferred_shipping_method IN (
      'mrw', 'tealca', 'zoom', 'domesa', 'libertyExpress', 'delivery', 'pickup'
    )
  );

COMMENT ON COLUMN public.orders.shipping_method IS
  'Agencia o modalidad de envío elegida por el cliente (mrw, zoom, delivery, etc.).';

COMMENT ON COLUMN public.orders.shipping_branch_code IS
  'Identificador de la sucursal de destino de la agencia de encomienda.';

COMMENT ON COLUMN public.orders.shipping_branch_name IS
  'Nombre legible de la sucursal de destino de la agencia.';

COMMENT ON COLUMN public.orders.shipping_branch_address IS
  'Dirección de la sucursal de destino donde el cliente retira el paquete.';

COMMENT ON COLUMN public.orders.delivery_address IS
  'Dirección de entrega a domicilio indicada en el pedido.';

COMMENT ON COLUMN public.customer_profiles.preferred_shipping_method IS
  'Última agencia o modalidad de envío usada por el cliente en esta tienda.';

COMMENT ON COLUMN public.customer_profiles.preferred_shipping_branch_code IS
  'Código de la sucursal de encomienda preferida del cliente.';

COMMENT ON COLUMN public.customer_profiles.preferred_shipping_branch_name IS
  'Nombre de la sucursal de encomienda preferida del cliente.';

COMMENT ON COLUMN public.customer_profiles.preferred_shipping_branch_address IS
  'Dirección de la sucursal de encomienda preferida del cliente.';
