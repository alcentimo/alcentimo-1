-- Vigencia diferida de la tasa BCV:
-- exchange_rate.effective_date = día en que la tasa debe mostrarse (America/Caracas).
-- get_current_exchange_rate() solo usa filas con effective_date <= hoy VE.

CREATE OR REPLACE FUNCTION public.get_current_exchange_rate()
RETURNS NUMERIC(18, 6)
LANGUAGE sql
STABLE
AS $$
  SELECT ROUND(COALESCE(
    (
      SELECT rate
      FROM public.exchange_rate
      WHERE store_id IS NULL
        AND effective_date <= (timezone('America/Caracas', now()))::date
      ORDER BY effective_date DESC
      LIMIT 1
    ),
    (
      SELECT tasa
      FROM public.tasas_cambio
      WHERE moneda = 'USD'
      ORDER BY ultima_actualizacion DESC
      LIMIT 1
    ),
    1::NUMERIC(18, 6)
  ), 2);
$$;

COMMENT ON FUNCTION public.get_current_exchange_rate() IS
  'Tasa BCV vigente: effective_date <= día actual en America/Caracas (activa a las 00:00).';

-- Alinea tasas_cambio con la tasa ya vigente (no adelanta la del día siguiente).
UPDATE public.tasas_cambio AS tc
SET
  tasa = src.rate,
  ultima_actualizacion = now()
FROM (
  SELECT rate
  FROM public.exchange_rate
  WHERE store_id IS NULL
    AND effective_date <= (timezone('America/Caracas', now()))::date
  ORDER BY effective_date DESC
  LIMIT 1
) AS src
WHERE tc.moneda = 'USD'
  AND src.rate IS NOT NULL
  AND tc.tasa IS DISTINCT FROM ROUND(src.rate, 2);
