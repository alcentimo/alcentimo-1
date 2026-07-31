-- Documenta el carry-forward: si el BCV se retrasa y no hay tasa de hoy,
-- get_current_exchange_rate() sigue devolviendo la última con effective_date <= hoy VE.

COMMENT ON FUNCTION public.get_current_exchange_rate() IS
  'Tasa BCV vigente: effective_date <= día actual en America/Caracas. Si aún no hay fila de hoy (BCV atrasado), usa la última tasa válida anterior (carry-forward) y luego tasas_cambio.';
