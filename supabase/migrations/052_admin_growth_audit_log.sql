-- Audit log de acciones del panel Crecimiento.

CREATE TABLE IF NOT EXISTS public.admin_growth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_user_id UUID NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_growth_audit_log_created
  ON public.admin_growth_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_growth_audit_log_actor
  ON public.admin_growth_audit_log (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_growth_audit_log_action
  ON public.admin_growth_audit_log (action, created_at DESC);

COMMENT ON TABLE public.admin_growth_audit_log IS
  'Historial de acciones del panel Crecimiento (otorgar Pro, cupones, campañas, promos).';

ALTER TABLE public.admin_growth_audit_log ENABLE ROW LEVEL SECURITY;

-- Solo service role escribe/lee (panel admin). Sin policies para roles normales.

-- Semilla: copiar otorgamientos previos ya registrados.
INSERT INTO public.admin_growth_audit_log (
  actor_id, action, target_user_id, summary, meta, created_at
)
SELECT
  g.granted_by,
  'grant_pro',
  g.user_id,
  'Otorgó plan ' || g.plan || ' por ' || g.days || ' días',
  jsonb_build_object(
    'plan', g.plan,
    'days', g.days,
    'note', g.note,
    'grant_id', g.id
  ),
  g.created_at
FROM public.admin_plan_grants g
WHERE NOT EXISTS (
  SELECT 1
  FROM public.admin_growth_audit_log a
  WHERE (a.meta ->> 'grant_id') = g.id::text
);
