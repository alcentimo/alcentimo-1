-- Datos globales de Pago Móvil de Alcentimo (destino de suscripciones).

CREATE TABLE IF NOT EXISTS public.payment_methods (
  method_key TEXT PRIMARY KEY
    CHECK (method_key = 'subscription_pago_movil'),
  bank TEXT NOT NULL,
  phone TEXT NOT NULL,
  ci TEXT NOT NULL,
  holder_name TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.payment_methods IS
  'Métodos de cobro de la plataforma (Pago Móvil de suscripciones).';
COMMENT ON COLUMN public.payment_methods.method_key IS
  'Clave fija; hoy solo subscription_pago_movil.';
COMMENT ON COLUMN public.payment_methods.holder_name IS
  'Nombre del titular de la cuenta / Pago Móvil.';

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_methods_public_read ON public.payment_methods;
CREATE POLICY payment_methods_public_read
  ON public.payment_methods FOR SELECT
  TO anon, authenticated
  USING (true);

-- Escritura solo vía service role (panel admin). Sin policy de INSERT/UPDATE para roles normales.

INSERT INTO public.payment_methods (method_key, bank, phone, ci, holder_name)
VALUES (
  'subscription_pago_movil',
  'Mercantil',
  '04129839915',
  '25074267',
  ''
)
ON CONFLICT (method_key) DO NOTHING;
