-- Contingencia BCV: modo automático (API) vs tasa manual del administrador.
-- Cuando bcv_rate_mode = 'manual', get_current_exchange_rate() usa manual_bcv_rate.

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS bcv_rate_mode TEXT NOT NULL DEFAULT 'automatic'
    CHECK (bcv_rate_mode IN ('automatic', 'manual'));

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS manual_bcv_rate NUMERIC(18, 6) NULL
    CHECK (manual_bcv_rate IS NULL OR manual_bcv_rate > 0);

COMMENT ON COLUMN public.platform_settings.bcv_rate_mode IS
  'Fuente de la tasa USD/VES: automatic (API BCV) o manual (valor ingresado por admin).';

COMMENT ON COLUMN public.platform_settings.manual_bcv_rate IS
  'Tasa de respaldo cuando bcv_rate_mode = manual. NULL si no se ha configurado.';

CREATE OR REPLACE FUNCTION public.get_current_exchange_rate()
RETURNS NUMERIC(18, 6)
LANGUAGE sql
STABLE
AS $$
  WITH ve AS (
    SELECT (timezone('America/Caracas', now()))::date AS today
  ),
  manual_override AS (
    SELECT ROUND(manual_bcv_rate, 2) AS rate
    FROM public.platform_settings
    WHERE id = 'default'
      AND bcv_rate_mode = 'manual'
      AND manual_bcv_rate IS NOT NULL
      AND manual_bcv_rate > 0
    LIMIT 1
  ),
  next_biz AS (
    SELECT CASE EXTRACT(DOW FROM ve.today)::int
      WHEN 5 THEN ve.today + 3
      WHEN 6 THEN ve.today + 2
      WHEN 0 THEN ve.today + 1
      ELSE
        CASE EXTRACT(DOW FROM (ve.today + 1))::int
          WHEN 6 THEN ve.today + 3
          WHEN 0 THEN ve.today + 2
          ELSE ve.today + 1
        END
    END AS next_business_date
    FROM ve
  ),
  as_of_today AS (
    SELECT rate, effective_date
    FROM public.exchange_rate, ve
    WHERE store_id IS NULL
      AND effective_date <= ve.today
    ORDER BY effective_date DESC
    LIMIT 1
  ),
  weekend_ahead AS (
    SELECT er.rate, er.effective_date
    FROM public.exchange_rate er
    CROSS JOIN ve
    CROSS JOIN next_biz nb
    WHERE er.store_id IS NULL
      AND EXTRACT(DOW FROM ve.today)::int IN (0, 6)
      AND er.effective_date = nb.next_business_date
    LIMIT 1
  )
  SELECT ROUND(COALESCE(
    (SELECT rate FROM manual_override),
    (SELECT rate FROM weekend_ahead),
    (SELECT rate FROM as_of_today),
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
  'Tasa USD/VES vigente. Si platform_settings.bcv_rate_mode = manual, usa manual_bcv_rate; si no, BCV por effective_date (finde→próximo hábil / carry-forward / tasas_cambio).';
