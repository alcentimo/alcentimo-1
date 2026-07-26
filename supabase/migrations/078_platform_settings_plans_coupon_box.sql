-- Interruptor maestro: cajón «¿Tienes un cupón?» en /dashboard/planes.

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS plans_coupon_box_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.platform_settings.plans_coupon_box_enabled IS
  'Si es false, oculta el canje de cupones en Planes y facturación para todas las tiendas.';
