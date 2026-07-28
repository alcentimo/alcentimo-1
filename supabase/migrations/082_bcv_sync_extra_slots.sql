-- Ventanas adicionales de sync BCV (midday / afternoon / autoheal).
-- El cron ya no omite reintentos: siempre consulta la API en cada ventana.

ALTER TABLE public.tasas_cambio_sync_logs
  DROP CONSTRAINT IF EXISTS tasas_cambio_sync_logs_slot_check;

ALTER TABLE public.tasas_cambio_sync_logs
  ADD CONSTRAINT tasas_cambio_sync_logs_slot_check
  CHECK (
    slot IN (
      'midnight',
      'morning',
      'midday',
      'retry',
      'afternoon',
      'manual',
      'autoheal'
    )
  );

COMMENT ON COLUMN public.tasas_cambio_sync_logs.slot IS
  'Ventana del intento VE: midnight 01:00, morning 06:00, midday 09:00, retry 12:00, afternoon 14:00, manual o autoheal.';
