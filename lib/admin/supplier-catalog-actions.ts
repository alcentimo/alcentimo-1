"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { recordSupplierPriceChangeAndNotify } from "@/lib/dropship/price-change";
import { MERCADO_CATALOG_CACHE_TAG } from "@/lib/mercado-oculto/catalog-cache";
import { revalidateAllPublicCatalogCaches } from "@/lib/catalog/public-catalog-cache";
import {
  normalizeSupplierProductCategory,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";
import {
  normalizePublicationStatus,
  parseUsdAmount,
  resolveCostoProveedorUsd,
  resolvePrecioMayoristaUsd,
  type SupplierPublicationStatus,
} from "@/lib/supplier/wholesale-price";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

export type AdminSupplierCatalogProduct = {
  id: string;
  title: string;
  description: string;
  category: SupplierProductCategory;
  stock: number;
  costoProveedorUsd: number;
  precioMayoristaUsd: number | null;
  marginUsd: number | null;
  publicationStatus: SupplierPublicationStatus;
  imageUrl: string | null;
  supplierUserId: string;
  supplierName: string;
  createdAt: string;
  updatedAt: string;
};

const PRODUCT_SELECT =
  "id, title, description, category, stock, base_price_usd, precio_mayorista, publication_status, image_url, created_by, created_at, updated_at, is_active";

async function requireSupportAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { ok: false as const, error: "No tienes permiso de administrador." };
  }
  return { ok: true as const, user };
}

function bustPublishedCatalogCaches() {
  revalidateTag(MERCADO_CATALOG_CACHE_TAG, "max");
  revalidatePath("/mercado-oculto");
  revalidatePath("/admin/dashboard");
  revalidatePath("/dashboard/catalogo");
  revalidateAllPublicCatalogCaches();
}

function marginUsd(
  costo: number,
  mayorista: number | null,
): number | null {
  if (mayorista == null) return null;
  return Math.round((mayorista - costo) * 100) / 100;
}

function mapAdminProduct(
  row: Record<string, unknown>,
  supplierNameById: Map<string, string>,
): AdminSupplierCatalogProduct {
  const costo = resolveCostoProveedorUsd(row);
  const mayorista = resolvePrecioMayoristaUsd(row);
  const supplierUserId = String(row.created_by ?? "");
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    category: normalizeSupplierProductCategory(row.category),
    stock: Number(row.stock) || 0,
    costoProveedorUsd: costo,
    precioMayoristaUsd: mayorista,
    marginUsd: marginUsd(costo, mayorista),
    publicationStatus: normalizePublicationStatus(row.publication_status),
    imageUrl:
      typeof row.image_url === "string" && row.image_url.trim()
        ? row.image_url.trim()
        : null,
    supplierUserId,
    supplierName: supplierNameById.get(supplierUserId) ?? "Proveedor",
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

async function loadSupplierNames(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return labels;

  const { data: profiles } = await admin
    .from("supplier_profiles")
    .select("user_id, company_name, email")
    .in("user_id", ids);

  for (const row of (profiles as Array<{
    user_id?: string;
    company_name?: string;
    email?: string;
  }> | null) ?? []) {
    const id = typeof row.user_id === "string" ? row.user_id : "";
    if (!id) continue;
    const company = String(row.company_name ?? "").trim();
    const email = String(row.email ?? "").trim();
    labels.set(id, company || email || "Proveedor");
  }

  return labels;
}

export async function listAdminSupplierCatalogProducts(): Promise<
  ActionResult<{ products: AdminSupplierCatalogProduct[]; draftCount: number }>
> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("supplier_products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return { error: error.message };

  const rows = (data as Record<string, unknown>[] | null) ?? [];
  const names = await loadSupplierNames(
    admin,
    rows.map((row) => String(row.created_by ?? "")),
  );
  const products = rows.map((row) => mapAdminProduct(row, names));
  return {
    products,
    draftCount: products.filter((item) => item.publicationStatus === "draft")
      .length,
  };
}

export async function setAdminSupplierWholesalePrice(input: {
  productId: string;
  precioMayoristaUsd: number | string;
  publish?: boolean;
}): Promise<ActionResult<{ product: AdminSupplierCatalogProduct }>> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const productId = input.productId.trim();
  if (!productId) return { error: "Producto inválido." };

  const precioMayoristaUsd = parseUsdAmount(input.precioMayoristaUsd);
  if (precioMayoristaUsd == null) {
    return { error: "Indica un precio mayorista válido en USD." };
  }

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("supplier_products")
    .select(PRODUCT_SELECT)
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (!existing) return { error: "Producto no encontrado." };

  const current = existing as Record<string, unknown>;
  const previousMayorista = resolvePrecioMayoristaUsd(current);
  const previousStatus = normalizePublicationStatus(current.publication_status);
  const nextStatus: SupplierPublicationStatus = input.publish
    ? "published"
    : previousStatus;

  if (nextStatus === "published" && precioMayoristaUsd < 0) {
    return { error: "El precio mayorista debe ser mayor o igual a 0." };
  }

  const { data, error } = await admin
    .from("supplier_products")
    .update({
      precio_mayorista: precioMayoristaUsd,
      publication_status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("is_active", true)
    .select(PRODUCT_SELECT)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "No se pudo actualizar el producto." };

  const updated = data as Record<string, unknown>;
  if (
    nextStatus === "published" &&
    previousMayorista != null &&
    previousMayorista !== precioMayoristaUsd
  ) {
    await recordSupplierPriceChangeAndNotify({
      admin,
      supplierProductId: productId,
      productTitle: String(updated.title ?? current.title ?? "Producto"),
      oldPriceUsd: previousMayorista,
      newPriceUsd: precioMayoristaUsd,
      changedBy: auth.user.id,
      note: "Actualización de precio mayorista por administrador.",
    });
  } else if (previousMayorista !== precioMayoristaUsd) {
    await admin.from("supplier_product_price_history").insert({
      supplier_product_id: productId,
      old_price_usd: previousMayorista,
      new_price_usd: precioMayoristaUsd,
      changed_by: auth.user.id,
      note: "Precio mayorista definido por administrador (borrador).",
    });
  }

  const names = await loadSupplierNames(admin, [
    String(updated.created_by ?? ""),
  ]);
  bustPublishedCatalogCaches();
  return { product: mapAdminProduct(updated, names) };
}

export async function publishAdminSupplierProduct(
  productId: string,
): Promise<ActionResult<{ product: AdminSupplierCatalogProduct }>> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const id = productId.trim();
  if (!id) return { error: "Producto inválido." };

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("supplier_products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (!existing) return { error: "Producto no encontrado." };

  const current = existing as Record<string, unknown>;
  const precioMayoristaUsd = resolvePrecioMayoristaUsd(current);
  if (precioMayoristaUsd == null) {
    return {
      error: "Define el precio mayorista antes de publicar el producto.",
    };
  }

  const { data, error } = await admin
    .from("supplier_products")
    .update({
      publication_status: "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("is_active", true)
    .select(PRODUCT_SELECT)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "No se pudo publicar el producto." };

  const updated = data as Record<string, unknown>;
  const names = await loadSupplierNames(admin, [
    String(updated.created_by ?? ""),
  ]);
  bustPublishedCatalogCaches();
  return { product: mapAdminProduct(updated, names) };
}

export async function unpublishAdminSupplierProduct(
  productId: string,
): Promise<ActionResult<{ product: AdminSupplierCatalogProduct }>> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const id = productId.trim();
  if (!id) return { error: "Producto inválido." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("supplier_products")
    .update({
      publication_status: "draft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("is_active", true)
    .select(PRODUCT_SELECT)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Producto no encontrado." };

  const updated = data as Record<string, unknown>;
  const names = await loadSupplierNames(admin, [
    String(updated.created_by ?? ""),
  ]);
  bustPublishedCatalogCaches();
  return { product: mapAdminProduct(updated, names) };
}
