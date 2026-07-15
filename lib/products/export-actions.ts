"use server";

import type { CatalogListItem } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { getStoreInventory } from "@/lib/inventory";
import {
  buildProductExportFileName,
  encodeProductsWorkbook,
} from "@/lib/products/export-xlsx";
import {
  buildCatalogCsvFileName,
  encodeProductsCsv,
} from "@/lib/products/export-csv";
import {
  buildCatalogPdfFileName,
  encodeProductsCatalogPdf,
} from "@/lib/products/export-pdf";

export interface ProductExportResult {
  ok: boolean;
  error?: string;
  fileBase64?: string;
  fileName?: string;
  rowCount?: number;
}

export interface CatalogPdfSourceData {
  ok: boolean;
  error?: string;
  storeName?: string;
  storeSlug?: string;
  products?: CatalogListItem[];
}

export async function getCatalogPdfSourceData(): Promise<CatalogPdfSourceData> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  try {
    const { products } = await getStoreInventory(auth.store.slug);
    return {
      ok: true,
      storeName: auth.store.name,
      storeSlug: auth.store.slug,
      products,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el catálogo para exportar.";
    return { ok: false, error: message };
  }
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

export async function exportProductsToCsv(): Promise<ProductExportResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const { store } = auth;

  try {
    const { products } = await getStoreInventory(store.slug);
    const buffer = encodeProductsCsv(products);
    const fileBase64 = buffer.toString("base64");

    return {
      ok: true,
      fileBase64,
      fileName: buildCatalogCsvFileName(store.slug),
      rowCount: products.length,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo generar el catálogo en CSV.";
    return { ok: false, error: message };
  }
}

export async function exportProductsToPdf(
  clientImages: Record<string, string | null> = {},
): Promise<ProductExportResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const { store } = auth;

  try {
    const { products } = await getStoreInventory(store.slug);
    const buffer = await encodeProductsCatalogPdf(
      store.name,
      products,
      clientImages,
    );
    const fileBase64 = buffer.toString("base64");

    return {
      ok: true,
      fileBase64,
      fileName: buildCatalogPdfFileName(store.slug),
      rowCount: products.length,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo generar el catálogo en PDF.";
    return { ok: false, error: message };
  }
}
