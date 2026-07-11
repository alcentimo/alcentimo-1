-- ============================================================
-- alcentimo-1 — Mensajes por integración (WhatsApp / Meta)
-- Ejecutar DESPUÉS de channel_integrations (012 o manual).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.channel_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id  UUID NOT NULL
                  REFERENCES public.channel_integrations(id) ON DELETE CASCADE,
  sender_id       TEXT NOT NULL,
  message_text    TEXT,
  direction       TEXT NOT NULL
                    CHECK (direction IN ('inbound', 'outbound')),
  status          TEXT NOT NULL DEFAULT 'unread'
                    CHECK (status IN ('read', 'unread')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Búsquedas por integración (bandeja / listado de canales)
CREATE INDEX IF NOT EXISTS idx_channel_messages_integration_id
  ON public.channel_messages (integration_id);

-- Búsquedas por remitente (cliente)
CREATE INDEX IF NOT EXISTS idx_channel_messages_sender_id
  ON public.channel_messages (sender_id);

-- Historial de chat: integración + cliente + orden cronológico (paginación rápida)
CREATE INDEX IF NOT EXISTS idx_channel_messages_chat_history
  ON public.channel_messages (integration_id, sender_id, created_at DESC);

-- ── RLS: miembros de la tienda dueña de la integración ──
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS channel_messages_member ON public.channel_messages;

CREATE POLICY channel_messages_member
  ON public.channel_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.channel_integrations ci
      WHERE ci.id = channel_messages.integration_id
        AND public.is_member_of_store(ci.store_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.channel_integrations ci
      WHERE ci.id = channel_messages.integration_id
        AND public.is_member_of_store(ci.store_id)
    )
  );

-- Service role (webhooks) inserta sin sesión de usuario; bypass con service role key.

COMMENT ON TABLE public.channel_messages IS
  'Mensajes entrantes y salientes por integración Meta/WhatsApp.';
COMMENT ON COLUMN public.channel_messages.sender_id IS
  'Identificador externo del cliente (wa_id, PSID de Messenger/Instagram, etc.).';
COMMENT ON COLUMN public.channel_messages.status IS
  'unread = pendiente de revisar en el panel; read = visto por el equipo.';
