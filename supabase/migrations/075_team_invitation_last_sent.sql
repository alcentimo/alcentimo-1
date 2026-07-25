-- Metadatos de reenvío para invitaciones de equipo.

ALTER TABLE public.store_invitations
  ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.store_invitations.last_sent_at IS
  'Marca de tiempo del último correo enviado (incluye reenvíos).';

UPDATE public.store_invitations
SET last_sent_at = created_at
WHERE last_sent_at IS NULL;
