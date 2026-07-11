-- ============================================================
-- alcentimo-1 — Soporte MercadoLibre en channel_integrations
-- Ejecutar DESPUÉS de 012_inbox_messaging.sql
-- ============================================================

ALTER TABLE public.channel_integrations
  DROP CONSTRAINT IF EXISTS channel_integrations_provider_check;

ALTER TABLE public.channel_integrations
  ADD CONSTRAINT channel_integrations_provider_check
  CHECK (provider IN ('whatsapp', 'messenger', 'instagram', 'mercadolibre'));

ALTER TABLE public.inbox_contacts
  DROP CONSTRAINT IF EXISTS inbox_contacts_provider_check;

ALTER TABLE public.inbox_contacts
  ADD CONSTRAINT inbox_contacts_provider_check
  CHECK (provider IN ('whatsapp', 'messenger', 'instagram', 'mercadolibre'));

ALTER TABLE public.inbox_conversations
  DROP CONSTRAINT IF EXISTS inbox_conversations_provider_check;

ALTER TABLE public.inbox_conversations
  ADD CONSTRAINT inbox_conversations_provider_check
  CHECK (provider IN ('whatsapp', 'messenger', 'instagram', 'mercadolibre'));
