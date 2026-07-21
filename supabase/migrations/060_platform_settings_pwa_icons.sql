-- Iconos PWA del logo global de la plataforma.

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS pwa_icon_192_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS pwa_icon_512_url TEXT NULL;

COMMENT ON COLUMN public.platform_settings.pwa_icon_192_url IS
  'Icono PWA 192x192 generado al subir el logo de plataforma.';
COMMENT ON COLUMN public.platform_settings.pwa_icon_512_url IS
  'Icono PWA 512x512 generado al subir el logo de plataforma.';
