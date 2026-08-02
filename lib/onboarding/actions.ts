"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { userHasStore } from "@/lib/stores";
import { slugify, uniqueSlug } from "@/lib/slugify";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import {
  isValidStoreRubro,
  normalizeStoreRubro,
  resolveImportCategoryForRubro,
} from "@/src/config/categories";
import {
  DEFAULT_STORE_COUNTRY,
  isStoreCountryOption,
} from "@/lib/onboarding/countries";
import {
  defaultStoreSettingsConfig,
  mergeStoreSettingsConfig,
} from "@/lib/store-settings/defaults";
import { scheduleStoreSubdomainProvision } from "@/lib/domains/provision-store-subdomain";
import type { OnboardingSampleProductDraft } from "@/lib/ai/onboarding-assistant-types";
import { sampleProductsToImportRows } from "@/lib/onboarding/sample-product-import";
import { importProductsBulk } from "@/lib/products/import-actions";
import { syncStoreProductCategories } from "@/lib/products/rubro-categories";

export type OnboardingFormState = {
  error?: string;
};

async function resolveUniqueStoreSlug(
  supabase: SupabaseClient,
  baseName: string,
): Promise<string> {
  let slug = slugify(baseName) || "mi-tienda";

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? slug : uniqueSlug(baseName, crypto.randomUUID());
    const { data: taken } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (!taken) return candidate;
    slug = candidate;
  }

  return uniqueSlug(baseName, crypto.randomUUID());
}

async function parseLandingProductsJson(
  raw: string,
  rubro: ReturnType<typeof normalizeStoreRubro>,
): Promise<OnboardingSampleProductDraft[] | null> {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const products: OnboardingSampleProductDraft[] = [];
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) continue;
      const row = item as Record<string, unknown>;
      const nombre = typeof row.nombre === "string" ? row.nombre.trim() : "";
      const descripcion =
        typeof row.descripcion === "string" ? row.descripcion.trim() : "";
      const precio =
        typeof row.precio === "number"
          ? row.precio
          : Number.parseFloat(String(row.precio ?? ""));
      const stock =
        typeof row.stock === "number"
          ? row.stock
          : Number.parseInt(String(row.stock ?? ""), 10);
      const categoriaRaw =
        typeof row.categoria === "string" ? row.categoria.trim() : "General";
      const categoria = resolveImportCategoryForRubro(
        rubro,
        categoriaRaw,
      ).label;

      if (!nombre || !Number.isFinite(precio) || precio <= 0 || !Number.isFinite(stock)) {
        continue;
      }

      products.push({
        nombre: nombre.slice(0, 80),
        descripcion: descripcion.slice(0, 180),
        precio,
        stock,
        categoria,
      });
    }

    return products.length > 0 ? products.slice(0, 3) : null;
  } catch {
    return null;
  }
}

export async function completeOnboarding(
  _prev: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const supabase = await createClient();
  const auth = await requireAuthUser(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  if (await userHasStore(supabase, auth.authUser.id)) {
    redirect("/dashboard/catalogo");
  }

  const name = String(formData.get("name") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const rubroRaw = String(formData.get("rubro_tienda") ?? "").trim().toLowerCase();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const landingProductsJson = String(formData.get("landing_products_json") ?? "");

  if (!name) {
    return { error: "El nombre de la tienda es obligatorio." };
  }

  if (!country || !isStoreCountryOption(country)) {
    return { error: "País no válido." };
  }

  if (country !== DEFAULT_STORE_COUNTRY) {
    return { error: "Alcentimo solo está disponible en Venezuela." };
  }

  if (!rubroRaw || !isValidStoreRubro(rubroRaw)) {
    return { error: "Selecciona el rubro de tu negocio." };
  }

  const rubroTienda = normalizeStoreRubro(rubroRaw);

  if (!whatsapp) {
    return { error: "Ingresa tu WhatsApp de contacto." };
  }

  if (!normalizeWhatsAppPhone(whatsapp)) {
    return {
      error: "Ingresa un número de WhatsApp válido (mínimo 10 dígitos).",
    };
  }

  const slug = await resolveUniqueStoreSlug(supabase, name);

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({
      owner_id: auth.authUser.id,
      name,
      slug,
      country,
      rubro_tienda: rubroTienda,
    })
    .select("id")
    .single();

  if (storeError) {
    if (storeError.code === "23505") {
      return { error: "Ese nombre de tienda ya está en uso. Prueba con otro." };
    }
    return { error: storeError.message };
  }

  scheduleStoreSubdomainProvision({ storeId: store.id, slug });

  const settingsConfig = mergeStoreSettingsConfig(defaultStoreSettingsConfig(), {
    contact: { whatsappPhone: whatsapp, whatsappPhones: [whatsapp] },
    catalogDesign: {
      theme: "minimal",
      saleMode: "quick",
      visibility: {
        showStock: true,
        showDescription: true,
        showPrices: true,
      },
    },
  });

  const { error: settingsError } = await supabase.from("store_settings").insert({
    store_id: store.id,
    config: settingsConfig,
  });

  if (settingsError) {
    return { error: settingsError.message };
  }

  // Template inicial de categorías según el rubro (idempotente).
  const categorySync = await syncStoreProductCategories(
    supabase,
    store.id,
    rubroTienda,
  );
  if (categorySync.error) {
    console.warn(
      JSON.stringify({
        scope: "onboarding-categories",
        event: "sync_failed",
        storeId: store.id,
        rubro: rubroTienda,
        error: categorySync.error,
      }),
    );
  }

  const landingProducts = await parseLandingProductsJson(
    landingProductsJson,
    rubroTienda,
  );
  if (landingProducts?.length) {
    await importProductsBulk(sampleProductsToImportRows(landingProducts));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/onboarding");
  revalidatePath(`/c/${slug}`);
  redirect("/dashboard/catalogo?onboarded=1");
}
