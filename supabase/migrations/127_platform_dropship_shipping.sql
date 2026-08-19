-- Envíos dropship centralizados: agencias nacionales y envío gratis
-- los administra Alcéntimo (Super Admin), no cada tienda.

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS dropship_shipping JSONB NOT NULL DEFAULT '{
    "carriers": {
      "mrw": true,
      "zoom": true,
      "tealca": false,
      "domesa": false,
      "libertyExpress": false
    },
    "pricingMode": "cod",
    "flatRateUsd": 3,
    "freeShippingEnabled": false,
    "freeShippingMinUsd": 25
  }'::jsonb;

COMMENT ON COLUMN public.platform_settings.dropship_shipping IS
  'Reglas globales de encomienda dropship (MRW, Zoom, cobro a destino, envío gratis). Se aplican a todas las vitrinas.';
