-- Límite de fotos por producto por plan (editable en admin).
-- NULL = sin límite comercial (sigue existiendo un tope técnico en la app).

ALTER TABLE public.plan_settings
  ADD COLUMN IF NOT EXISTS photo_limit INTEGER
    CHECK (photo_limit IS NULL OR (photo_limit >= 1 AND photo_limit <= 50));

COMMENT ON COLUMN public.plan_settings.photo_limit IS
  'Máximo de fotos (galería) por producto. NULL = ilimitado (tope técnico en la app).';

UPDATE public.plan_settings
SET photo_limit = 5
WHERE plan_key = 'FREE' AND photo_limit IS NULL;

UPDATE public.plan_settings
SET photo_limit = 10
WHERE plan_key = 'PRO' AND photo_limit IS NULL;

UPDATE public.plan_settings
SET photo_limit = 20
WHERE plan_key = 'BUSINESS' AND photo_limit IS NULL;

-- ENTERPRISE: NULL (ilimitado)
UPDATE public.plan_settings
SET photo_limit = NULL
WHERE plan_key = 'ENTERPRISE';
