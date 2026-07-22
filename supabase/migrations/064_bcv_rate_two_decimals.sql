-- ============================================================
-- Tasa BCV y precios en VES: siempre 2 decimales (estándar VE)
-- ============================================================

-- Redondea la tasa vigente al leerla.
CREATE OR REPLACE FUNCTION public.get_current_exchange_rate()
RETURNS NUMERIC(18, 6)
LANGUAGE sql
STABLE
AS $$
  SELECT ROUND(COALESCE(
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
  ), 2);
$$;

-- Precios en bolívares a exactamente 2 decimales.
CREATE OR REPLACE FUNCTION public.price_in_ves(p_amount_usd NUMERIC)
RETURNS NUMERIC(18, 2)
LANGUAGE sql
STABLE
AS $$
  SELECT ROUND(p_amount_usd * public.get_current_exchange_rate(), 2);
$$;

-- Normaliza tasas ya persistidas.
UPDATE public.tasas_cambio
SET tasa = ROUND(tasa, 2)
WHERE moneda = 'USD'
  AND tasa <> ROUND(tasa, 2);

UPDATE public.exchange_rate
SET rate = ROUND(rate, 2)
WHERE store_id IS NULL
  AND rate <> ROUND(rate, 2);
