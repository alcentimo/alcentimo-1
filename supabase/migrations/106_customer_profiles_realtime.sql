-- Habilita Realtime en customer_profiles para que "Mis Clientes"
-- del dashboard refleje altas y cambios de nombre/teléfono al instante.
-- RLS (customer_profiles_select_store_member) sigue aplicando a los eventos.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'customer_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_profiles;
  END IF;
END
$$;
