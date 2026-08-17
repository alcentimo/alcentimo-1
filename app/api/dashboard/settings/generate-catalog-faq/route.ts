import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { generateCatalogFaq } from "@/lib/ai/generate-catalog-faq";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { getPublicStoreCategories } from "@/lib/catalog/get-public-store-categories";
import { getPaymentMethod } from "@/src/config/payment-methods";
import { getShippingMethod } from "@/src/config/shipping-methods";
import {
  getRubroLabel,
  normalizeStoreRubro,
} from "@/src/config/categories";
import type { PaymentMethodKey } from "@/lib/store-settings/types";
import type { ShippingCarrierKey } from "@/lib/store-settings/types";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const [settings, productsResult, storeCategories] = await Promise.all([
      getStoreSettingsConfig(auth.store.id),
      supabase
        .from("products")
        .select("name")
        .eq("store_id", auth.store.id)
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false })
        .limit(12),
      getPublicStoreCategories(auth.store.id),
    ]);

    if (productsResult.error) {
      throw new Error(productsResult.error.message);
    }

    const rubro = normalizeStoreRubro(auth.store.rubro_tienda);
    const paymentLabels = (
      Object.entries(settings.payments.methods) as Array<
        [PaymentMethodKey, { enabled: boolean }]
      >
    )
      .filter(([, method]) => method.enabled)
      .map(([key]) => {
        try {
          return getPaymentMethod(key).label;
        } catch {
          return null;
        }
      })
      .filter((label): label is string => Boolean(label));

    const shippingLabels = (
      Object.entries(settings.shipping.carriers) as Array<
        [ShippingCarrierKey, boolean]
      >
    )
      .filter(([, enabled]) => enabled)
      .map(([key]) => getShippingMethod(key)?.label ?? null)
      .filter((label): label is string => Boolean(label));

    const categoryLabels = storeCategories
      .map((row) => row.name.trim())
      .filter(Boolean);

    const productNames = (productsResult.data ?? [])
      .map((row) => (typeof row.name === "string" ? row.name.trim() : ""))
      .filter(Boolean);

    const result = await generateCatalogFaq({
      storeName: auth.store.name,
      storeRubro: getRubroLabel(rubro),
      storeDescription: auth.store.description,
      city: settings.locationHours.city,
      address: settings.locationHours.address,
      paymentLabels,
      shippingLabels,
      categoryLabels,
      productNames,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al generar las preguntas frecuentes.";
    const status =
      message.includes("OPENAI") ||
      message.includes("OpenAI") ||
      message.includes("no está configurada")
        ? 503
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
