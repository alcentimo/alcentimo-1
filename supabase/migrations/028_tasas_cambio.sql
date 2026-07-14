-- ============================================================
-- alcentimo-1 — Tasas de cambio automáticas (BCV)
-- Ejecutar DESPUÉS de 027_orders_estado_operativo.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tasas_cambio (
  moneda               TEXT PRIMARY KEY,
  tasa                 NUMERIC(18, 6) NOT NULL CHECK (tasa > 0),
  ultima_actualizacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tasas_cambio IS
  'Tasas de cambio oficiales sincronizadas automáticamente (ej. USD BCV).';

COMMENT ON COLUMN public.tasas_cambio.moneda IS
  'Código de moneda base (ej. USD).';

COMMENT ON COLUMN public.tasas_cambio.tasa IS
  'Unidades de moneda local (VES) por 1 unidad de moneda base.';

ALTER TABLE public.tasas_cambio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasas_cambio_public_read ON public.tasas_cambio;
CREATE POLICY tasas_cambio_public_read
  ON public.tasas_cambio FOR SELECT
  TO anon, authenticated
  USING (true);

-- Prioriza tasas_cambio; mantiene compatibilidad con exchange_rate legacy.
CREATE OR REPLACE FUNCTION public.get_current_exchange_rate()
RETURNS NUMERIC(18, 6)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT tasa
      FROM public.tasas_cambio
      WHERE moneda = 'USD'
      ORDER BY ultima_actualizacion DESC
      LIMIT 1
    ),
    (
      SELECT rate
      FROM public.exchange_rate
      WHERE store_id IS NULL
      ORDER BY effective_date DESC
      LIMIT 1
    ),
    1::NUMERIC(18, 6)
  );
$$;

-- Semilla inicial desde la tasa legacy si existe.
INSERT INTO public.tasas_cambio (moneda, tasa, ultima_actualizacion)
SELECT
  'USD',
  rate,
  COALESCE(created_at, now())
FROM public.exchange_rate
WHERE store_id IS NULL
ORDER BY effective_date DESC
LIMIT 1
ON CONFLICT (moneda) DO NOTHING;
