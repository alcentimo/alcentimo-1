import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { isStoreOwner } from "@/lib/stores/owner-access";
import { getOpenAiApiKey } from "@/lib/env/server";
import {
  listPendingMarketingSuggestions,
  runMarketingAiScanForStore,
} from "@/lib/marketing-ai/run-scan";

export const dynamic = "force-dynamic";

/**
 * Genera (o refresca) sugerencias de marketing con la IA existente.
 * Body opcional: { refresh?: boolean }
 */
export async function POST(request: Request) {
  if (!getOpenAiApiKey()) {
    return NextResponse.json(
      { error: "La IA no está configurada (OPENAI_API_KEY)." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  if (!isStoreOwner(auth.store, auth.authUser.id)) {
    return NextResponse.json({ error: "Solo el dueño." }, { status: 403 });
  }

  let refresh = true;
  try {
    const body = (await request.json()) as { refresh?: boolean };
    if (body?.refresh === false) refresh = false;
  } catch {
    refresh = true;
  }

  if (refresh) {
    const scan = await runMarketingAiScanForStore(supabase, {
      storeId: auth.store.id,
      storeSlug: auth.store.slug,
      storeName: auth.store.name,
      storeRubro: auth.store.rubro_tienda ?? null,
    });
    if (scan.error) {
      const status = /OPENAI|configurad/i.test(scan.error) ? 503 : 400;
      return NextResponse.json({ error: scan.error }, { status });
    }
  }

  try {
    const suggestions = await listPendingMarketingSuggestions(
      supabase,
      auth.store.id,
    );
    return NextResponse.json(
      { suggestions },
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar sugerencias.",
      },
      { status: 400 },
    );
  }
}
