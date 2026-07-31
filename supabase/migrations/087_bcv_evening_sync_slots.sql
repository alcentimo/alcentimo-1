-- Ventanas vespertinas BCV: el BCV suele publicar ~16:00–17:00 VE.
-- Antes el último cron era 14:00 VE y se perdía la tasa del día (sobre todo viernes).

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
      'evening',
      'late_evening',
      'manual',
      'autoheal'
    )
  );

COMMENT ON COLUMN public.tasas_cambio_sync_logs.slot IS
  'Ventana VE: midnight 01:00, morning 06:00, midday 09:00, retry 12:00, afternoon 14:00, evening 17:00, late_evening 19:00, manual o autoheal.';
