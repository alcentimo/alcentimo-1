-- ============================================================
-- alcentimo-1 — Monitoreo de sincronización BCV (00:00 y 06:00)
-- Ejecutar DESPUÉS de 028_tasas_cambio.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tasas_cambio_sync_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_date     DATE NOT NULL,
  slot          TEXT NOT NULL CHECK (slot IN ('midnight', 'retry')),
  status        TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  rate          NUMERIC(18, 6),
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasas_cambio_sync_logs_date
  ON public.tasas_cambio_sync_logs (sync_date DESC, created_at DESC);

COMMENT ON TABLE public.tasas_cambio_sync_logs IS
  'Historial de intentos de sincronización de tasa BCV (medianoche y reintento 06:00).';

CREATE TABLE IF NOT EXISTS public.platform_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type  TEXT NOT NULL,
  message     TEXT NOT NULL,
  detail      TEXT,
  sync_date   DATE NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_alerts_active
  ON public.platform_alerts (alert_type, sync_date)
  WHERE resolved_at IS NULL;

COMMENT ON TABLE public.platform_alerts IS
  'Alertas de plataforma visibles en el panel (ej. fallo de tasa BCV tras reintento).';

ALTER TABLE public.tasas_cambio_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_alerts_authenticated_read ON public.platform_alerts;
CREATE POLICY platform_alerts_authenticated_read
  ON public.platform_alerts FOR SELECT
  TO authenticated
  USING (true);
