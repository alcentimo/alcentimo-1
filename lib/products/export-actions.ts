"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { getStoreInventory } from "@/lib/inventory";
import {
  buildProductExportFileName,
  encodeProductsWorkbook,
} from "@/lib/products/export-xlsx";

export interface ProductExportResult {
  ok: boolean;
  error?: string;
  fileBase64?: string;
  fileName?: string;
  rowCount?: number;
}

export async function exportProductsToExcel(): Promise<ProductExportResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const { store } = auth;

  try {
    const { products } = await getStoreInventory(store.slug);
    const buffer = await encodeProductsWorkbook(products);
    const fileBase64 = buffer.toString("base64");

    return {
      ok: true,
      fileBase64,
      fileName: buildProductExportFileName(store.slug),
      rowCount: products.length,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo generar el archivo de exportación.";
    return { ok: false, error: message };
  }
}
