-- Slot "morning" para sincronización BCV obligatoria a las 06:00 (America/Caracas).

ALTER TABLE public.tasas_cambio_sync_logs
  DROP CONSTRAINT IF EXISTS tasas_cambio_sync_logs_slot_check;

ALTER TABLE public.tasas_cambio_sync_logs
  ADD CONSTRAINT tasas_cambio_sync_logs_slot_check
  CHECK (slot IN ('midnight', 'morning', 'retry', 'manual'));

COMMENT ON COLUMN public.tasas_cambio_sync_logs.slot IS
  'Ventana del intento: midnight (01:00 VE), morning (06:00 VE), retry (12:00 VE) o manual (dashboard).';
