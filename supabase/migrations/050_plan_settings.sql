-- Configuración editable de planes de suscripción (FREE / PRO / BUSINESS).

CREATE TABLE IF NOT EXISTS public.plan_settings (
  plan_key TEXT PRIMARY KEY
    CHECK (plan_key IN ('FREE', 'PRO', 'BUSINESS')),
  display_name TEXT NOT NULL,
  monthly_usd NUMERIC(10, 2) NOT NULL CHECK (monthly_usd >= 0),
  annual_usd NUMERIC(10, 2) NULL CHECK (annual_usd IS NULL OR annual_usd >= 0),
  product_limit INTEGER NULL CHECK (product_limit IS NULL OR product_limit > 0),
  user_limit INTEGER NULL CHECK (user_limit IS NULL OR user_limit > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL
);

COMMENT ON TABLE public.plan_settings IS
  'Precios y límites de planes de la plataforma (editables desde el panel admin).';
COMMENT ON COLUMN public.plan_settings.product_limit IS
  'Tope de productos activos; NULL = ilimitados.';
COMMENT ON COLUMN public.plan_settings.user_limit IS
  'Tope opcional de usuarios/miembros; NULL = sin límite configurado.';
COMMENT ON COLUMN public.plan_settings.annual_usd IS
  'Total anual cobrado; NULL si el plan no tiene facturación anual (p. ej. FREE).';

ALTER TABLE public.plan_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_settings_public_read ON public.plan_settings;
CREATE POLICY plan_settings_public_read
  ON public.plan_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Escritura solo vía service role (panel admin).

INSERT INTO public.plan_settings (
  plan_key, display_name, monthly_usd, annual_usd, product_limit, user_limit
)
VALUES
  ('FREE', 'Gratis', 0, NULL, 10, NULL),
  ('PRO', 'Pro', 8, 75, 250, NULL),
  ('BUSINESS', 'Business', 15, 144, NULL, NULL)
ON CONFLICT (plan_key) DO NOTHING;
