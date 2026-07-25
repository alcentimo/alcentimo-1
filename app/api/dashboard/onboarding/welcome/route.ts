import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { generateOnboardingWelcomeMessage } from "@/lib/ai/onboarding-assistant";
import { getRubroLabel, normalizeStoreRubro, type StoreRubro } from "@/src/config/categories";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const rubro = normalizeStoreRubro(auth.store.rubro_tienda as StoreRubro);
  const rubroLabel = getRubroLabel(rubro);

  try {
    const message = await generateOnboardingWelcomeMessage({
      storeName: auth.store.name,
      rubroLabel,
    });

    return NextResponse.json(
      { message, storeName: auth.store.name, rubroLabel },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo generar el saludo.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
