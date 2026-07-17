export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

/** Lee env pública sin lanzar — seguro en tiempo de importación / build. */
export function readSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function hasSupabasePublicEnv(): boolean {
  return readSupabasePublicEnv() !== null;
}

/** Solo al usar Supabase en runtime (request, action, etc.). */
export function requireSupabasePublicEnv(): SupabasePublicEnv {
  const config = readSupabasePublicEnv();

  if (!config) {
    throw new Error(
      "Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel → Settings → Environment Variables.",
    );
  }

  return config;
}
