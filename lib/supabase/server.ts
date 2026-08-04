import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabasePublicEnv } from "@/lib/supabase/config";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

async function resolveRequestHostname(): Promise<string | undefined> {
  try {
    const headerStore = await headers();
    const host =
      headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? undefined;
    return host?.split(",")[0]?.trim().split(":")[0] || undefined;
  } catch {
    return undefined;
  }
}

export async function createClient(): Promise<SupabaseClient> {
  const { url, anonKey } = requireSupabasePublicEnv();
  const cookieStore = await cookies();
  const hostname = await resolveRequestHostname();

  return createServerClient(url, anonKey, {
    cookieOptions: getSupabaseCookieOptions(hostname),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll puede fallar en Server Components de solo lectura
        }
      },
    },
  });
}

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
