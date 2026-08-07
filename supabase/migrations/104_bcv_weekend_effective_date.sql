-- Tasa BCV por fecha de vigencia oficial + uso en fin de semana.
--
-- Reglas:
-- 1) exchange_rate.effective_date = fecha oficial de la API (no “hoy del servidor”).
-- 2) Viernes→lunes: la tasa publicada el viernes con vigencia lunes se guarda
--    con effective_date = lunes (unique index global por día).
-- 3) Sábado/domingo: get_current_exchange_rate() usa esa tasa del próximo hábil
--    si ya está publicada; si no, carry-forward (última <= hoy VE).

CREATE OR REPLACE FUNCTION public.get_current_exchange_rate()
RETURNS NUMERIC(18, 6)
LANGUAGE sql
STABLE
AS $$
  WITH ve AS (
    SELECT (timezone('America/Caracas', now()))::date AS today
  ),
  next_biz AS (
    SELECT CASE EXTRACT(DOW FROM ve.today)::int
      -- Viernes → lunes (+3); sábado → lunes (+2); domingo → lunes (+1);
      -- hábil → día siguiente hábil (salta sábado/domingo).
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
  'Tasa BCV vigente por effective_date oficial. En sábado/domingo usa la del próximo hábil (lunes) si ya está publicada; si no, carry-forward (última <= hoy VE) y luego tasas_cambio.';

COMMENT ON COLUMN public.exchange_rate.effective_date IS
  'Fecha de vigencia oficial BCV (America/Caracas). Una fila global por día (idx_exchange_rate_global_per_day). Viernes puede insertar la del lunes sin mezclar días hábiles.';
