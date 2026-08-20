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
  mayoristaFromMarginPercent,
  marginPercentFromPrices,
  marginUsdFromPrices,
  normalizePublicationStatus,
  parsePercentAmount,
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
  marginPercent: number | null;
  publicationStatus: SupplierPublicationStatus;
  imageUrl: string | null;
  supplierUserId: string;
  supplierName: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminSupplierMarginOption = {
  id: string;
  name: string;
  productCount: number;
  draftCount: number;
  globalMarginPercent: number | null;
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
    marginUsd: mayorista == null ? null : marginUsdFromPrices(costo, mayorista),
    marginPercent:
      mayorista == null ? null : marginPercentFromPrices(costo, mayorista),
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

async function loadMarginRules(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Map<string, number>> {
  const rules = new Map<string, number>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return rules;

  const { data } = await admin
    .from("supplier_wholesale_margin_rules")
    .select("supplier_user_id, margin_percent")
    .in("supplier_user_id", ids);

  for (const row of (data as Array<{
    supplier_user_id?: string;
    margin_percent?: unknown;
  }> | null) ?? []) {
    const id = typeof row.supplier_user_id === "string" ? row.supplier_user_id : "";
    const percent = parsePercentAmount(row.margin_percent, { min: 0, max: 1000 });
    if (!id || percent == null) continue;
    rules.set(id, percent);
  }

  return rules;
}

function buildSupplierOptions(
  products: AdminSupplierCatalogProduct[],
  marginBySupplier: Map<string, number>,
): AdminSupplierMarginOption[] {
  const grouped = new Map<
    string,
    { name: string; productCount: number; draftCount: number }
  >();
  for (const product of products) {
    const current = grouped.get(product.supplierUserId) ?? {
      name: product.supplierName,
      productCount: 0,
      draftCount: 0,
    };
    current.productCount += 1;
    if (product.publicationStatus === "draft") current.draftCount += 1;
    grouped.set(product.supplierUserId, current);
  }

  return [...grouped.entries()]
    .map(([id, value]) => ({
      id,
      name: value.name,
      productCount: value.productCount,
      draftCount: value.draftCount,
      globalMarginPercent: marginBySupplier.get(id) ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function listAdminSupplierCatalogProducts(): Promise<
  ActionResult<{
    products: AdminSupplierCatalogProduct[];
    draftCount: number;
    suppliers: AdminSupplierMarginOption[];
  }>
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
  const creatorIds = rows.map((row) => String(row.created_by ?? ""));
  const [names, marginBySupplier] = await Promise.all([
    loadSupplierNames(admin, creatorIds),
    loadMarginRules(admin, creatorIds),
  ]);
  const products = rows.map((row) => mapAdminProduct(row, names));
  return {
    products,
    draftCount: products.filter((item) => item.publicationStatus === "draft")
      .length,
    suppliers: buildSupplierOptions(products, marginBySupplier),
  };
}

export async function countAdminSupplierDraftProducts(): Promise<number> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return 0;

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("supplier_products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("publication_status", "draft");

  if (error) return 0;
  return count ?? 0;
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

export async function setSupplierGlobalMarginRule(input: {
  supplierUserId: string;
  marginPercent: number | string;
}): Promise<ActionResult<{ supplier: AdminSupplierMarginOption }>> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const supplierUserId = input.supplierUserId.trim();
  if (!supplierUserId) return { error: "Selecciona un proveedor." };

  const marginPercent = parsePercentAmount(input.marginPercent, {
    min: 0,
    max: 1000,
  });
  if (marginPercent == null) {
    return { error: "Indica un margen global entre 0% y 1000%." };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("supplier_wholesale_margin_rules").upsert(
    {
      supplier_user_id: supplierUserId,
      margin_percent: marginPercent,
      updated_by: auth.user.id,
      updated_at: now,
    },
    { onConflict: "supplier_user_id" },
  );

  if (error) return { error: error.message };

  const names = await loadSupplierNames(admin, [supplierUserId]);
  const { count } = await admin
    .from("supplier_products")
    .select("id", { count: "exact", head: true })
    .eq("created_by", supplierUserId)
    .eq("is_active", true);
  const { count: draftCount } = await admin
    .from("supplier_products")
    .select("id", { count: "exact", head: true })
    .eq("created_by", supplierUserId)
    .eq("is_active", true)
    .eq("publication_status", "draft");

  revalidatePath("/admin/dashboard");
  return {
    supplier: {
      id: supplierUserId,
      name: names.get(supplierUserId) ?? "Proveedor",
      productCount: count ?? 0,
      draftCount: draftCount ?? 0,
      globalMarginPercent: marginPercent,
    },
  };
}

async function applyGlobalMarginToSupplierProducts(input: {
  admin: ReturnType<typeof createAdminClient>;
  changedBy: string;
  supplierUserId: string;
  marginPercent: number;
}): Promise<{ updated: number; publishedUpdated: number; error?: string }> {
  const { admin, changedBy, supplierUserId, marginPercent } = input;
  const { data, error } = await admin
    .from("supplier_products")
    .select(PRODUCT_SELECT)
    .eq("created_by", supplierUserId)
    .eq("is_active", true);

  if (error) return { updated: 0, publishedUpdated: 0, error: error.message };

  const rows = (data as Record<string, unknown>[] | null) ?? [];
  let updated = 0;
  let publishedUpdated = 0;
  const now = new Date().toISOString();
  const note = `Recálculo por margen global del proveedor (${marginPercent}%).`;

  for (const row of rows) {
    const id = String(row.id ?? "");
    if (!id) continue;
    const costo = resolveCostoProveedorUsd(row);
    const nextPrice = mayoristaFromMarginPercent(costo, marginPercent);
    const previous = resolvePrecioMayoristaUsd(row);
    if (previous === nextPrice) continue;

    const { error: updateError } = await admin
      .from("supplier_products")
      .update({
        precio_mayorista: nextPrice,
        updated_at: now,
      })
      .eq("id", id)
      .eq("is_active", true);

    if (updateError) {
      return { updated, publishedUpdated, error: updateError.message };
    }

    updated += 1;
    const isPublished =
      normalizePublicationStatus(row.publication_status) === "published";
    if (isPublished && previous != null) {
      await recordSupplierPriceChangeAndNotify({
        admin,
        supplierProductId: id,
        productTitle: String(row.title ?? "Producto"),
        oldPriceUsd: previous,
        newPriceUsd: nextPrice,
        changedBy,
        note,
      });
      publishedUpdated += 1;
    } else {
      await admin.from("supplier_product_price_history").insert({
        supplier_product_id: id,
        old_price_usd: previous,
        new_price_usd: nextPrice,
        changed_by: changedBy,
        note,
      });
    }
  }

  return { updated, publishedUpdated };
}

export async function applySupplierGlobalMargin(input: {
  supplierUserId: string;
  marginPercent?: number | string;
}): Promise<
  ActionResult<{
    updated: number;
    publishedUpdated: number;
    marginPercent: number;
    products: AdminSupplierCatalogProduct[];
    suppliers: AdminSupplierMarginOption[];
  }>
> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const supplierUserId = input.supplierUserId.trim();
  if (!supplierUserId) return { error: "Selecciona un proveedor." };

  const admin = createAdminClient();
  let marginPercent = parsePercentAmount(input.marginPercent, {
    min: 0,
    max: 1000,
  });

  if (marginPercent == null) {
    const rules = await loadMarginRules(admin, [supplierUserId]);
    marginPercent = rules.get(supplierUserId) ?? null;
  }
  if (marginPercent == null) {
    return {
      error: "Define un margen global para este proveedor antes de recalcular.",
    };
  }

  const persist = await setSupplierGlobalMarginRule({
    supplierUserId,
    marginPercent,
  });
  if (persist.error) return { error: persist.error };

  const applied = await applyGlobalMarginToSupplierProducts({
    admin,
    changedBy: auth.user.id,
    supplierUserId,
    marginPercent,
  });
  if (applied.error) return { error: applied.error };

  bustPublishedCatalogCaches();
  const listed = await listAdminSupplierCatalogProducts();
  if (listed.error) {
    return {
      updated: applied.updated,
      publishedUpdated: applied.publishedUpdated,
      marginPercent,
    };
  }

  return {
    updated: applied.updated,
    publishedUpdated: applied.publishedUpdated,
    marginPercent,
    products: listed.products ?? [],
    suppliers: listed.suppliers ?? [],
  };
}

export async function recalculateAllSupplierGlobalMargins(): Promise<
  ActionResult<{
    supplierCount: number;
    updated: number;
    publishedUpdated: number;
    products: AdminSupplierCatalogProduct[];
    suppliers: AdminSupplierMarginOption[];
  }>
> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("supplier_wholesale_margin_rules")
    .select("supplier_user_id, margin_percent");

  if (error) return { error: error.message };

  const rules =
    (data as Array<{
      supplier_user_id?: string;
      margin_percent?: unknown;
    }> | null) ?? [];
  if (rules.length === 0) {
    return {
      error: "No hay márgenes globales configurados para recalcular.",
    };
  }

  let updated = 0;
  let publishedUpdated = 0;
  let supplierCount = 0;

  for (const row of rules) {
    const supplierUserId =
      typeof row.supplier_user_id === "string" ? row.supplier_user_id : "";
    const marginPercent = parsePercentAmount(row.margin_percent, {
      min: 0,
      max: 1000,
    });
    if (!supplierUserId || marginPercent == null) continue;
    supplierCount += 1;
    const applied = await applyGlobalMarginToSupplierProducts({
      admin,
      changedBy: auth.user.id,
      supplierUserId,
      marginPercent,
    });
    if (applied.error) return { error: applied.error };
    updated += applied.updated;
    publishedUpdated += applied.publishedUpdated;
  }

  bustPublishedCatalogCaches();
  const listed = await listAdminSupplierCatalogProducts();
  if (listed.error) {
    return { supplierCount, updated, publishedUpdated };
  }

  return {
    supplierCount,
    updated,
    publishedUpdated,
    products: listed.products ?? [],
    suppliers: listed.suppliers ?? [],
  };
}
