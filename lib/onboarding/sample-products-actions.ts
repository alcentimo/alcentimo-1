"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { generateOnboardingSampleProducts } from "@/lib/ai/onboarding-assistant";
import { assertCanCreateProduct } from "@/lib/plans/product-limit";
import { importProductsBulk } from "@/lib/products/import-actions";
import type { ValidatedImportRow } from "@/lib/products/import-schema";
import { normalizeStoreRubro, type StoreRubro } from "@/src/config/categories";

export type CreateSampleProductsResult =
  | {
      ok: true;
      created: number;
      intro: string;
      productNames: string[];
    }
  | {
      ok: false;
      error: string;
    };

function toImportRows(
  products: Awaited<ReturnType<typeof generateOnboardingSampleProducts>>["products"],
): ValidatedImportRow[] {
  return products.map((product, index) => ({
    rowNumber: index + 2,
    nombre: product.nombre,
    descripcion: product.descripcion,
    precio: product.precio,
    stock: product.stock,
    url_imagen: null,
    categoria: product.categoria,
  }));
}

export async function createOnboardingSampleProducts(): Promise<CreateSampleProductsResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const { store } = auth;
  const rubro = normalizeStoreRubro(store.rubro_tienda as StoreRubro);

  const productLimitCheck = await assertCanCreateProduct(store.id);
  if (!productLimitCheck.ok) {
    return { ok: false, error: productLimitCheck.error };
  }

  const generated = await generateOnboardingSampleProducts(rubro);
  const rows = toImportRows(generated.products);

  if (rows.length === 0) {
    return { ok: false, error: "No se pudieron generar productos de ejemplo." };
  }

  const importResult = await importProductsBulk(rows);

  if (!importResult.ok && importResult.created === 0) {
    return {
      ok: false,
      error: importResult.errors[0] ?? "No se pudieron crear los productos de ejemplo.",
    };
  }

  revalidatePath("/dashboard/catalogo");
  revalidatePath(`/tienda/${store.slug}`);

  return {
    ok: true,
    created: importResult.created,
    intro: generated.intro,
    productNames: generated.products.map((product) => product.nombre),
  };
}
