-- Métodos de pago de suscripción: múltiples cuentas + QR + activo/inactivo.

ALTER TABLE public.payment_methods
  DROP CONSTRAINT IF EXISTS payment_methods_method_key_check;

ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS qr_image_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

COMMENT ON TABLE public.payment_methods IS
  'Métodos de cobro de la plataforma para suscripciones (Pago Móvil, Zelle, etc.).';
COMMENT ON COLUMN public.payment_methods.method_key IS
  'Identificador estable del método (slug).';
COMMENT ON COLUMN public.payment_methods.display_name IS
  'Nombre visible (ej. Pago Móvil Mercantil, Zelle).';
COMMENT ON COLUMN public.payment_methods.bank IS
  'Banco o plataforma de cobro.';
COMMENT ON COLUMN public.payment_methods.phone IS
  'Teléfono o correo de contacto para el pago.';
COMMENT ON COLUMN public.payment_methods.qr_image_url IS
  'URL pública del código QR (platform-assets).';
COMMENT ON COLUMN public.payment_methods.is_active IS
  'Si es false, no se muestra en el checkout de suscripción.';
COMMENT ON COLUMN public.payment_methods.sort_order IS
  'Orden de aparición en admin y checkout.';

-- Backfill del método semilla existente.
UPDATE public.payment_methods
SET
  display_name = CASE
    WHEN coalesce(trim(display_name), '') = '' THEN
      CASE
        WHEN coalesce(trim(bank), '') <> '' THEN 'Pago Móvil ' || trim(bank)
        ELSE 'Pago Móvil'
      END
    ELSE display_name
  END,
  is_active = coalesce(is_active, true),
  sort_order = coalesce(sort_order, 0)
WHERE method_key = 'subscription_pago_movil';

CREATE INDEX IF NOT EXISTS payment_methods_active_sort_idx
  ON public.payment_methods (is_active DESC, sort_order ASC, display_name ASC);
