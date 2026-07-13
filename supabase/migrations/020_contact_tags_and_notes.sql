-- ============================================================
-- Notas internas y etiquetas por contacto (solo equipo de la tienda)
-- Ejecutar DESPUÉS de 012_inbox_messaging.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contact_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES public.inbox_contacts(id) ON DELETE CASCADE,
  body        TEXT NOT NULL DEFAULT '',
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT contact_notes_contact_unique UNIQUE (contact_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_notes_store
  ON public.contact_notes (store_id);

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact
  ON public.contact_notes (contact_id);

DROP TRIGGER IF EXISTS trg_contact_notes_updated_at ON public.contact_notes;
CREATE TRIGGER trg_contact_notes_updated_at
BEFORE UPDATE ON public.contact_notes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS public.contact_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES public.inbox_contacts(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT contact_tags_label_not_empty CHECK (char_length(trim(label)) > 0),
  CONSTRAINT contact_tags_contact_label_unique UNIQUE (contact_id, label)
);

CREATE INDEX IF NOT EXISTS idx_contact_tags_store
  ON public.contact_tags (store_id);

CREATE INDEX IF NOT EXISTS idx_contact_tags_contact
  ON public.contact_tags (contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_tags_store_label
  ON public.contact_tags (store_id, label);

-- Migrar datos previos guardados en inbox_contacts.metadata
INSERT INTO public.contact_notes (store_id, contact_id, body)
SELECT
  ic.store_id,
  ic.id,
  COALESCE(NULLIF(trim(ic.metadata->>'private_notes'), ''), '')
FROM public.inbox_contacts ic
WHERE COALESCE(trim(ic.metadata->>'private_notes'), '') <> ''
ON CONFLICT (contact_id) DO UPDATE
SET
  body = EXCLUDED.body,
  updated_at = now();

INSERT INTO public.contact_tags (store_id, contact_id, label)
SELECT DISTINCT
  ic.store_id,
  ic.id,
  trim(tag_value)
FROM public.inbox_contacts ic
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE
    WHEN jsonb_typeof(ic.metadata->'tags') = 'array' THEN ic.metadata->'tags'
    ELSE '[]'::jsonb
  END
) AS tag(tag_value)
WHERE trim(tag_value) <> ''
ON CONFLICT (contact_id, label) DO NOTHING;

ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_notes_member ON public.contact_notes;
CREATE POLICY contact_notes_member
  ON public.contact_notes FOR ALL
  TO authenticated
  USING (public.is_member_of_store(store_id))
  WITH CHECK (public.is_member_of_store(store_id));

DROP POLICY IF EXISTS contact_tags_member ON public.contact_tags;
CREATE POLICY contact_tags_member
  ON public.contact_tags FOR ALL
  TO authenticated
  USING (public.is_member_of_store(store_id))
  WITH CHECK (public.is_member_of_store(store_id));
