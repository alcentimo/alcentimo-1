-- Dirección física y horarios de retiro para recolección B2B de Alcéntimo.

ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS warehouse_address TEXT NOT NULL DEFAULT '';

ALTER TABLE public.supplier_profiles
  ADD COLUMN IF NOT EXISTS pickup_hours TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.supplier_profiles.warehouse_address IS
  'Dirección física del almacén o tienda donde Alcéntimo retira el producto.';

COMMENT ON COLUMN public.supplier_profiles.pickup_hours IS
  'Horarios en los que Alcéntimo puede pasar a retirar mercadería.';
