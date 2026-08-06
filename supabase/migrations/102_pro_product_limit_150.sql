-- Alinea el límite del Plan Pro con la oferta comercial actual (150 productos).
UPDATE public.plan_settings
SET product_limit = 150,
    updated_at = now()
WHERE plan_key = 'PRO'
  AND (product_limit IS NULL OR product_limit = 250);
