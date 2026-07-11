-- ============================================================
-- alcentimo-1 — Inbox unificado: migrar channel_messages → inbox_*
-- Ejecutar DESPUÉS de 013_channel_messages.sql y 014_mercadolibre_provider.sql
-- ============================================================

-- ── 1. Contactos desde channel_messages ──
INSERT INTO public.inbox_contacts (store_id, provider, external_id)
SELECT DISTINCT
  ci.store_id,
  ci.provider,
  cm.sender_id
FROM public.channel_messages cm
JOIN public.channel_integrations ci ON ci.id = cm.integration_id
ON CONFLICT (store_id, provider, external_id) DO NOTHING;

-- ── 2. Conversaciones (una por tienda + canal + contacto) ──
INSERT INTO public.inbox_conversations (
  store_id,
  integration_id,
  contact_id,
  provider,
  last_message_at,
  last_message_preview,
  unread_count
)
SELECT DISTINCT ON (ci.store_id, ci.provider, ic.id)
  ci.store_id,
  cm.integration_id,
  ic.id,
  ci.provider,
  cm.created_at,
  LEFT(COALESCE(cm.message_text, '[mensaje]'), 280),
  CASE
    WHEN cm.direction = 'inbound' AND cm.status = 'unread' THEN 1
    ELSE 0
  END
FROM public.channel_messages cm
JOIN public.channel_integrations ci ON ci.id = cm.integration_id
JOIN public.inbox_contacts ic
  ON ic.store_id = ci.store_id
 AND ic.provider = ci.provider
 AND ic.external_id = cm.sender_id
ORDER BY ci.store_id, ci.provider, ic.id, cm.created_at DESC
ON CONFLICT (store_id, provider, contact_id) DO NOTHING;

-- ── 3. Mensajes (IDs legacy para idempotencia) ──
INSERT INTO public.inbox_messages (
  store_id,
  conversation_id,
  direction,
  sender_type,
  body,
  message_type,
  external_message_id,
  status,
  sent_at,
  created_at
)
SELECT
  ci.store_id,
  conv.id,
  cm.direction,
  CASE WHEN cm.direction = 'inbound' THEN 'customer' ELSE 'agent' END,
  cm.message_text,
  'text',
  'legacy:channel_messages:' || cm.id::text,
  CASE
    WHEN cm.direction = 'outbound' THEN 'sent'
    WHEN cm.status = 'read' THEN 'read'
    ELSE 'received'
  END,
  cm.created_at,
  cm.created_at
FROM public.channel_messages cm
JOIN public.channel_integrations ci ON ci.id = cm.integration_id
JOIN public.inbox_contacts ic
  ON ic.store_id = ci.store_id
 AND ic.provider = ci.provider
 AND ic.external_id = cm.sender_id
JOIN public.inbox_conversations conv
  ON conv.store_id = ci.store_id
 AND conv.provider = ci.provider
 AND conv.contact_id = ic.id
ON CONFLICT (store_id, external_message_id) DO NOTHING;

-- ── 4. Recalcular preview y no leídos por conversación ──
WITH latest AS (
  SELECT DISTINCT ON (im.conversation_id)
    im.conversation_id,
    im.body,
    im.created_at,
    im.direction,
    im.status
  FROM public.inbox_messages im
  ORDER BY im.conversation_id, im.created_at DESC
),
unread AS (
  SELECT
    im.conversation_id,
    COUNT(*)::integer AS unread_count
  FROM public.inbox_messages im
  WHERE im.direction = 'inbound'
    AND im.status = 'received'
  GROUP BY im.conversation_id
)
UPDATE public.inbox_conversations conv
SET
  last_message_at = latest.created_at,
  last_message_preview = LEFT(COALESCE(latest.body, '[mensaje]'), 280),
  unread_count = COALESCE(unread.unread_count, 0),
  updated_at = now()
FROM latest
LEFT JOIN unread ON unread.conversation_id = latest.conversation_id
WHERE conv.id = latest.conversation_id;

COMMENT ON TABLE public.channel_messages IS
  'Deprecada: los webhooks escriben en inbox_messages. Se conserva para rollback.';
