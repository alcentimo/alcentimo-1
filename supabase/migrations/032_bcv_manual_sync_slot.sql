-- Permitir slot "manual" en logs de sincronización BCV (botón del dashboard).

ALTER TABLE public.tasas_cambio_sync_logs
  DROP CONSTRAINT IF EXISTS tasas_cambio_sync_logs_slot_check;

ALTER TABLE public.tasas_cambio_sync_logs
  ADD CONSTRAINT tasas_cambio_sync_logs_slot_check
  CHECK (slot IN ('midnight', 'retry', 'manual'));

COMMENT ON COLUMN public.tasas_cambio_sync_logs.slot IS
  'Ventana del intento: midnight (00:00 VE), retry (06:00 VE) o manual (dashboard).';
