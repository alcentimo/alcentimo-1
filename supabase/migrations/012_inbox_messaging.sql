-- ============================================================
-- alcentimo-1 — Inbox / atención al cliente (WhatsApp, Messenger, Instagram)
-- Ejecutar DESPUÉS de 002_stores_multi_tenancy.sql
-- ============================================================

-- ── 1. Integraciones por tienda (Meta / WhatsApp Cloud API) ──
CREATE TABLE IF NOT EXISTS public.channel_integrations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id             UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider             TEXT NOT NULL
                         CHECK (provider IN ('whatsapp', 'messenger', 'instagram')),
  external_account_id  TEXT NOT NULL,
  display_name         TEXT,
  -- Referencia externa o metadatos NO sensibles (phone_number_id, page_id, ig_user_id…)
  config               JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Token de verificación del webhook (único por integración o compartido vía env)
  webhook_verify_token TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT channel_integrations_unique
    UNIQUE (store_id, provider, external_account_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_integrations_store
  ON public.channel_integrations (store_id);

CREATE INDEX IF NOT EXISTS idx_channel_integrations_lookup
  ON public.channel_integrations (provider, external_account_id)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_channel_integrations_updated_at ON public.channel_integrations;
CREATE TRIGGER trg_channel_integrations_updated_at
BEFORE UPDATE ON public.channel_integrations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Tokens de acceso: tabla separada, solo service role (nunca exponer al cliente)
CREATE TABLE IF NOT EXISTS public.channel_integration_secrets (
  integration_id  UUID PRIMARY KEY
                  REFERENCES public.channel_integrations(id) ON DELETE CASCADE,
  access_token    TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Contactos externos (clientes en WhatsApp / Meta) ──
CREATE TABLE IF NOT EXISTS public.inbox_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL
                    CHECK (provider IN ('whatsapp', 'messenger', 'instagram')),
  external_id     TEXT NOT NULL,
  display_name    TEXT,
  phone_e164      TEXT,
  avatar_url      TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT inbox_contacts_unique
    UNIQUE (store_id, provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_inbox_contacts_store
  ON public.inbox_contacts (store_id);

-- ── 3. Conversaciones ──
CREATE TABLE IF NOT EXISTS public.inbox_conversations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  integration_id      UUID REFERENCES public.channel_integrations(id) ON DELETE SET NULL,
  contact_id          UUID NOT NULL REFERENCES public.inbox_contacts(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL
                        CHECK (provider IN ('whatsapp', 'messenger', 'instagram')),
  external_thread_id  TEXT,
  status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'pending', 'closed')),
  subject             TEXT,
  last_message_preview TEXT,
  last_message_at     TIMESTAMPTZ,
  unread_count        INTEGER NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  assigned_to         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT inbox_conversations_thread_unique
    UNIQUE (store_id, provider, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_inbox_conversations_store_updated
  ON public.inbox_conversations (store_id, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_inbox_conversations_store_status
  ON public.inbox_conversations (store_id, status);

DROP TRIGGER IF EXISTS trg_inbox_conversations_updated_at ON public.inbox_conversations;
CREATE TRIGGER trg_inbox_conversations_updated_at
BEFORE UPDATE ON public.inbox_conversations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 4. Mensajes ──
CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  conversation_id     UUID NOT NULL REFERENCES public.inbox_conversations(id) ON DELETE CASCADE,
  direction           TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_type         TEXT NOT NULL DEFAULT 'customer'
                        CHECK (sender_type IN ('customer', 'agent', 'system')),
  sender_user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body                TEXT,
  message_type        TEXT NOT NULL DEFAULT 'text'
                        CHECK (message_type IN (
                          'text', 'image', 'audio', 'video', 'document',
                          'location', 'sticker', 'template', 'unknown'
                        )),
  external_message_id TEXT,
  status              TEXT NOT NULL DEFAULT 'received'
                        CHECK (status IN (
                          'received', 'sent', 'delivered', 'read', 'failed'
                        )),
  sent_at             TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  read_at             TIMESTAMPTZ,
  raw_payload         JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT inbox_messages_external_unique
    UNIQUE (store_id, external_message_id)
);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_conversation
  ON public.inbox_messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_store_created
  ON public.inbox_messages (store_id, created_at DESC);

-- ── 5. RLS ──
ALTER TABLE public.channel_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_integration_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

-- Integraciones: miembros de la tienda
DROP POLICY IF EXISTS channel_integrations_member ON public.channel_integrations;
CREATE POLICY channel_integrations_member
  ON public.channel_integrations FOR ALL
  TO authenticated
  USING (public.is_member_of_store(store_id))
  WITH CHECK (public.is_member_of_store(store_id));

-- Secretos: sin acceso desde cliente autenticado (solo service role / backend)
DROP POLICY IF EXISTS channel_integration_secrets_deny ON public.channel_integration_secrets;
CREATE POLICY channel_integration_secrets_deny
  ON public.channel_integration_secrets FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS inbox_contacts_member ON public.inbox_contacts;
CREATE POLICY inbox_contacts_member
  ON public.inbox_contacts FOR ALL
  TO authenticated
  USING (public.is_member_of_store(store_id))
  WITH CHECK (public.is_member_of_store(store_id));

DROP POLICY IF EXISTS inbox_conversations_member ON public.inbox_conversations;
CREATE POLICY inbox_conversations_member
  ON public.inbox_conversations FOR ALL
  TO authenticated
  USING (public.is_member_of_store(store_id))
  WITH CHECK (public.is_member_of_store(store_id));

DROP POLICY IF EXISTS inbox_messages_member ON public.inbox_messages;
CREATE POLICY inbox_messages_member
  ON public.inbox_messages FOR ALL
  TO authenticated
  USING (public.is_member_of_store(store_id))
  WITH CHECK (public.is_member_of_store(store_id));

-- ── 6. RPC: incrementar no leídos al insertar mensaje entrante ──
CREATE OR REPLACE FUNCTION public.inbox_touch_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inbox_conversations
  SET
    last_message_at = COALESCE(NEW.sent_at, NEW.created_at),
    last_message_preview = LEFT(COALESCE(NEW.body, '[' || NEW.message_type || ']'), 280),
    unread_count = CASE
      WHEN NEW.direction = 'inbound' THEN unread_count + 1
      ELSE unread_count
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inbox_message_touch_conversation ON public.inbox_messages;
CREATE TRIGGER trg_inbox_message_touch_conversation
AFTER INSERT ON public.inbox_messages
FOR EACH ROW EXECUTE FUNCTION public.inbox_touch_conversation_on_message();
