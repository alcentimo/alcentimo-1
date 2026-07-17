-- ============================================================
-- alcentimo-1 — Mensajes de soporte / sugerencias del dashboard
-- Ejecutar DESPUÉS de 034_inventory_logs_reserve_quantity_check.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.support_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email      TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT support_messages_email_nonempty
    CHECK (char_length(trim(email)) >= 3),
  CONSTRAINT support_messages_message_length
    CHECK (char_length(trim(message)) >= 10 AND char_length(message) <= 2000),
  CONSTRAINT support_messages_status_check
    CHECK (status IN ('pendiente', 'atendido', 'cerrado'))
);

CREATE INDEX IF NOT EXISTS idx_support_messages_status_created
  ON public.support_messages (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_messages_user_created
  ON public.support_messages (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.support_messages IS
  'Mensajes de soporte y sugerencias enviados desde el dashboard.';

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_messages_insert_authenticated ON public.support_messages;
CREATE POLICY support_messages_insert_authenticated
  ON public.support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND char_length(trim(email)) >= 3
    AND char_length(trim(message)) >= 10
  );
