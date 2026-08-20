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
  catalogVisible: boolean;
  isVisible: boolean;
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
  catalogVisible: boolean;
};

const PRODUCT_SELECT =
  "id, title, description, category, stock, base_price_usd, precio_mayorista, publication_status, catalog_visible, is_visible, image_url, created_by, created_at, updated_at, is_active";

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
    catalogVisible: row.catalog_visible === true,
    isVisible: row.is_visible !== false,
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

async function loadCatalogVisibility(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Map<string, boolean>> {
  const visibility = new Map<string, boolean>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return visibility;

  const { data } = await admin
    .from("supplier_catalog_visibility")
    .select("supplier_user_id, catalog_visible")
    .in("supplier_user_id", ids);

  for (const row of (data as Array<{
    supplier_user_id?: string;
    catalog_visible?: unknown;
  }> | null) ?? []) {
    const id = typeof row.supplier_user_id === "string" ? row.supplier_user_id : "";
    if (!id) continue;
    visibility.set(id, row.catalog_visible === true);
  }
  return visibility;
}

function buildSupplierOptions(
  products: AdminSupplierCatalogProduct[],
  marginBySupplier: Map<string, number>,
  visibilityBySupplier: Map<string, boolean>,
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
      catalogVisible: visibilityBySupplier.get(id) === true,
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
  const pageSize = 1000;
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from("supplier_products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) return { error: error.message };
    const batch = (data as Record<string, unknown>[] | null) ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  const creatorIds = rows.map((row) => String(row.created_by ?? ""));
  const [names, marginBySupplier, visibilityBySupplier] = await Promise.all([
    loadSupplierNames(admin, creatorIds),
    loadMarginRules(admin, creatorIds),
    loadCatalogVisibility(admin, creatorIds),
  ]);
  const products = rows.map((row) => mapAdminProduct(row, names));
  return {
    products,
    draftCount: products.filter((item) => item.publicationStatus === "draft")
      .length,
    suppliers: buildSupplierOptions(
      products,
      marginBySupplier,
      visibilityBySupplier,
    ),
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

function mapCatalogDbError(message: string): string {
  const text = message.toLowerCase();
  if (
    text.includes("precio_mayorista") &&
    (text.includes("does not exist") || text.includes("schema cache"))
  ) {
    return "Falta aplicar la migración de precio mayorista en la base de datos.";
  }
  if (
    text.includes("publication_status") &&
    (text.includes("does not exist") || text.includes("schema cache"))
  ) {
    return "Falta aplicar la migración de publicación mayorista en la base de datos.";
  }
  if (
    text.includes("catalog_visible") &&
    (text.includes("does not exist") || text.includes("schema cache"))
  ) {
    return "Falta aplicar la migración de visibilidad de catálogo mayorista.";
  }
  if (
    text.includes("is_visible") &&
    (text.includes("does not exist") || text.includes("schema cache"))
  ) {
    return "Falta aplicar la migración de visibilidad por producto.";
  }
  return message;
}

export async function setAdminSupplierWholesalePrice(input: {
  productId: string;
  precioMayoristaUsd: number | string;
  publish?: boolean;
}): Promise<ActionResult<{ product: AdminSupplierCatalogProduct }>> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const persisted = await persistAdminWholesalePrice({
    admin: createAdminClient(),
    changedBy: auth.user.id,
    productId: input.productId,
    precioMayoristaUsd: input.precioMayoristaUsd,
    publish: input.publish,
  });
  if (persisted.error || !persisted.product) {
    return { error: persisted.error ?? "No se pudo actualizar el producto." };
  }
  bustPublishedCatalogCaches();
  return { product: persisted.product };
}

export async function saveAdminSupplierWholesalePrices(
  items: Array<{ productId: string; precioMayoristaUsd: number | string }>,
): Promise<
  ActionResult<{ saved: number; products: AdminSupplierCatalogProduct[] }>
> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };
  if (items.length === 0) {
    return { error: "No hay cambios de precio para guardar." };
  }

  const admin = createAdminClient();
  const products: AdminSupplierCatalogProduct[] = [];
  for (const item of items) {
    const persisted = await persistAdminWholesalePrice({
      admin,
      changedBy: auth.user.id,
      productId: item.productId,
      precioMayoristaUsd: item.precioMayoristaUsd,
    });
    if (persisted.error || !persisted.product) {
      return {
        error: persisted.error ?? "No se pudo guardar uno de los precios.",
        saved: products.length,
        products,
      };
    }
    products.push(persisted.product);
  }

  bustPublishedCatalogCaches();
  return { saved: products.length, products };
}

async function persistAdminWholesalePrice(input: {
  admin: ReturnType<typeof createAdminClient>;
  changedBy: string;
  productId: string;
  precioMayoristaUsd: number | string;
  publish?: boolean;
}): Promise<ActionResult<{ product: AdminSupplierCatalogProduct }>> {
  const productId = input.productId.trim();
  if (!productId) return { error: "Producto inválido." };

  const precioMayoristaUsd = parseUsdAmount(input.precioMayoristaUsd);
  if (precioMayoristaUsd == null) {
    return { error: "Indica un precio mayorista válido en USD." };
  }

  const { data: existing, error: existingError } = await input.admin
    .from("supplier_products")
    .select(PRODUCT_SELECT)
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle();

  if (existingError) return { error: mapCatalogDbError(existingError.message) };
  if (!existing) return { error: "Producto no encontrado." };

  const current = existing as Record<string, unknown>;
  const previousMayorista = resolvePrecioMayoristaUsd(current);
  const previousStatus = normalizePublicationStatus(current.publication_status);
  const creatorId = String(current.created_by ?? "");
  const supplierVisibility = creatorId
    ? await loadCatalogVisibility(input.admin, [creatorId])
    : new Map<string, boolean>();
  const supplierCatalogOn = supplierVisibility.get(creatorId) === true;
  const nextStatus: SupplierPublicationStatus =
    input.publish || supplierCatalogOn ? "published" : previousStatus;
  const nextVisible = supplierCatalogOn || nextStatus === "published";

  if (nextStatus === "published" && precioMayoristaUsd < 0) {
    return { error: "El precio mayorista debe ser mayor o igual a 0." };
  }

  const { data, error } = await input.admin
    .from("supplier_products")
    .update({
      precio_mayorista: precioMayoristaUsd,
      publication_status: nextStatus,
      catalog_visible: nextVisible,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("is_active", true)
    .select(PRODUCT_SELECT)
    .maybeSingle();

  if (error) return { error: mapCatalogDbError(error.message) };
  if (!data) return { error: "No se pudo actualizar el producto." };

  const updated = data as Record<string, unknown>;
  if (
    nextStatus === "published" &&
    previousMayorista != null &&
    previousMayorista !== precioMayoristaUsd
  ) {
    await recordSupplierPriceChangeAndNotify({
      admin: input.admin,
      supplierProductId: productId,
      productTitle: String(updated.title ?? current.title ?? "Producto"),
      oldPriceUsd: previousMayorista,
      newPriceUsd: precioMayoristaUsd,
      changedBy: input.changedBy,
      note: "Actualización de precio mayorista por administrador.",
    });
  } else if (previousMayorista !== precioMayoristaUsd) {
    await input.admin.from("supplier_product_price_history").insert({
      supplier_product_id: productId,
      old_price_usd: previousMayorista,
      new_price_usd: precioMayoristaUsd,
      changed_by: input.changedBy,
      note: "Precio mayorista definido por administrador (borrador).",
    });
  }

  const names = await loadSupplierNames(input.admin, [
    String(updated.created_by ?? ""),
  ]);
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

  if (existingError) return { error: mapCatalogDbError(existingError.message) };
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
      catalog_visible: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("is_active", true)
    .select(PRODUCT_SELECT)
    .maybeSingle();

  if (error) return { error: mapCatalogDbError(error.message) };
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
      catalog_visible: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("is_active", true)
    .select(PRODUCT_SELECT)
    .maybeSingle();

  if (error) return { error: mapCatalogDbError(error.message) };
  if (!data) return { error: "Producto no encontrado." };

  const updated = data as Record<string, unknown>;
  const names = await loadSupplierNames(admin, [
    String(updated.created_by ?? ""),
  ]);
  bustPublishedCatalogCaches();
  return { product: mapAdminProduct(updated, names) };
}

export async function setAdminSupplierProductVisibility(input: {
  productId: string;
  visible: boolean;
}): Promise<ActionResult<{ product: AdminSupplierCatalogProduct }>> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const productId = input.productId.trim();
  if (!productId) return { error: "Producto inválido." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("supplier_products")
    .update({
      is_visible: input.visible,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("is_active", true)
    .select(PRODUCT_SELECT)
    .maybeSingle();

  if (error) return { error: mapCatalogDbError(error.message) };
  if (!data) return { error: "Producto no encontrado." };

  const updated = data as Record<string, unknown>;
  const names = await loadSupplierNames(admin, [
    String(updated.created_by ?? ""),
  ]);
  bustPublishedCatalogCaches();
  revalidatePath("/dashboard/inventario");
  return { product: mapAdminProduct(updated, names) };
}

export async function setSupplierCatalogPublication(input: {
  supplierUserId: string;
  published: boolean;
}): Promise<
  ActionResult<{
    updated: number;
    skippedWithoutPrice: number;
    products: AdminSupplierCatalogProduct[];
    suppliers: AdminSupplierMarginOption[];
  }>
> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const supplierUserId = input.supplierUserId.trim();
  if (!supplierUserId) return { error: "Selecciona un proveedor." };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: visibilityError } = await admin
    .from("supplier_catalog_visibility")
    .upsert(
      {
        supplier_user_id: supplierUserId,
        catalog_visible: input.published,
        updated_by: auth.user.id,
        updated_at: now,
      },
      { onConflict: "supplier_user_id" },
    );
  if (visibilityError) return { error: mapCatalogDbError(visibilityError.message) };

  const { data, error } = await admin
    .from("supplier_products")
    .select("id, precio_mayorista")
    .eq("created_by", supplierUserId)
    .eq("is_active", true);

  if (error) return { error: mapCatalogDbError(error.message) };

  const rows = (data as Record<string, unknown>[] | null) ?? [];
  const pricedCount = rows.filter(
    (row) => resolvePrecioMayoristaUsd(row) != null,
  ).length;

  if (input.published && pricedCount === 0) {
    return {
      error:
        "Ningún producto de este proveedor tiene precio mayorista todavía.",
      updated: 0,
      skippedWithoutPrice: rows.length,
    };
  }

  const patch = input.published
    ? {
        catalog_visible: true,
        publication_status: "published",
        updated_at: now,
      }
    : {
        catalog_visible: false,
        publication_status: "draft",
        updated_at: now,
      };

  let query = admin
    .from("supplier_products")
    .update(patch)
    .eq("created_by", supplierUserId)
    .eq("is_active", true);
  if (input.published) {
    query = query.not("precio_mayorista", "is", null);
  }
  const { error: updateError } = await query;
  if (updateError) return { error: mapCatalogDbError(updateError.message) };

  const updated = input.published ? pricedCount : rows.length;
  const skippedWithoutPrice = input.published
    ? Math.max(0, rows.length - pricedCount)
    : 0;

  bustPublishedCatalogCaches();
  revalidatePath("/dashboard/inventario");
  const listed = await listAdminSupplierCatalogProducts();
  if (listed.error) {
    return { updated, skippedWithoutPrice };
  }

  return {
    updated,
    skippedWithoutPrice,
    products: listed.products ?? [],
    suppliers: listed.suppliers ?? [],
  };
}

async function listActiveSupplierUserIds(
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ ids: string[]; error?: string }> {
  const { data, error } = await admin
    .from("supplier_products")
    .select("created_by")
    .eq("is_active", true);
  if (error) return { ids: [], error: error.message };
  const ids = [
    ...new Set(
      ((data as Array<{ created_by?: string }> | null) ?? [])
        .map((row) => String(row.created_by ?? ""))
        .filter(Boolean),
    ),
  ];
  return { ids };
}

async function upsertAdminMarginRules(input: {
  admin: ReturnType<typeof createAdminClient>;
  supplierUserIds: string[];
  marginPercent: number;
  updatedBy: string;
}): Promise<{ error?: string }> {
  const now = new Date().toISOString();
  const rows = input.supplierUserIds.map((supplierUserId) => ({
    supplier_user_id: supplierUserId,
    margin_percent: input.marginPercent,
    updated_by: input.updatedBy,
    updated_at: now,
  }));
  if (rows.length === 0) return {};
  const { error } = await input.admin
    .from("supplier_wholesale_margin_rules")
    .upsert(rows, { onConflict: "supplier_user_id" });
  return error ? { error: error.message } : {};
}

export async function setSupplierGlobalMarginRule(input: {
  supplierUserId: string;
  marginPercent: number | string;
}): Promise<ActionResult<{ supplier: AdminSupplierMarginOption }>> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const supplierUserId = input.supplierUserId.trim();
  if (!supplierUserId) {
    return { error: "Selecciona un proveedor o todos los productos." };
  }

  const marginPercent = parsePercentAmount(input.marginPercent, {
    min: 0,
    max: 1000,
  });
  if (marginPercent == null) {
    return {
      error: "Indica el porcentaje de ganancia de Alcéntimo (0% a 1000%).",
    };
  }

  const admin = createAdminClient();
  const listedIds =
    supplierUserId === "all" ? await listActiveSupplierUserIds(admin) : null;
  if (listedIds?.error) return { error: listedIds.error };
  const targetIds = supplierUserId === "all" ? listedIds!.ids : [supplierUserId];
  if (supplierUserId === "all" && targetIds.length === 0) {
    return { error: "No hay productos de proveedores para guardar el margen." };
  }

  const upserted = await upsertAdminMarginRules({
    admin,
    supplierUserIds: targetIds,
    marginPercent,
    updatedBy: auth.user.id,
  });
  if (upserted.error) return { error: upserted.error };

  if (supplierUserId === "all") {
    const listed = await listAdminSupplierCatalogProducts();
    const productCount = listed.products?.length ?? 0;
    const draftCount = listed.draftCount ?? 0;
    revalidatePath("/admin/dashboard");
    return {
      supplier: {
        id: "all",
        name: "Todos los productos",
        productCount,
        draftCount,
        globalMarginPercent: marginPercent,
        catalogVisible: false,
      },
    };
  }

  const names = await loadSupplierNames(admin, [supplierUserId]);
  const visibility = await loadCatalogVisibility(admin, [supplierUserId]);
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
      catalogVisible: visibility.get(supplierUserId) === true,
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
  const visibility = await loadCatalogVisibility(admin, [supplierUserId]);
  const catalogOn = visibility.get(supplierUserId) === true;
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
  const note = `Recálculo por margen de Alcéntimo (${marginPercent}%).`;

  for (const row of rows) {
    const id = String(row.id ?? "");
    if (!id) continue;
    const costo = resolveCostoProveedorUsd(row);
    const nextPrice = mayoristaFromMarginPercent(costo, marginPercent);
    const previous = resolvePrecioMayoristaUsd(row);
    const wasPublished =
      normalizePublicationStatus(row.publication_status) === "published" &&
      row.catalog_visible === true;
    if (previous === nextPrice && (!catalogOn || wasPublished)) continue;

    const { error: updateError } = await admin
      .from("supplier_products")
      .update({
        precio_mayorista: nextPrice,
        ...(catalogOn
          ? { publication_status: "published", catalog_visible: true }
          : {}),
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
  if (!supplierUserId) {
    return { error: "Selecciona un proveedor o todos los productos." };
  }

  const admin = createAdminClient();
  let marginPercent = parsePercentAmount(input.marginPercent, {
    min: 0,
    max: 1000,
  });

  const listedIds =
    supplierUserId === "all" ? await listActiveSupplierUserIds(admin) : null;
  if (listedIds?.error) return { error: listedIds.error };
  const targetIds = supplierUserId === "all" ? listedIds!.ids : [supplierUserId];
  if (targetIds.length === 0) {
    return { error: "No hay productos de proveedores para aplicar el margen." };
  }

  if (marginPercent == null && supplierUserId !== "all") {
    const rules = await loadMarginRules(admin, targetIds);
    marginPercent = rules.get(supplierUserId) ?? null;
  }
  if (marginPercent == null) {
    return {
      error: "Indica el porcentaje de ganancia de Alcéntimo (0% a 1000%).",
    };
  }

  const persist = await upsertAdminMarginRules({
    admin,
    supplierUserIds: targetIds,
    marginPercent,
    updatedBy: auth.user.id,
  });
  if (persist.error) return { error: persist.error };

  let updated = 0;
  let publishedUpdated = 0;
  for (const id of targetIds) {
    const applied = await applyGlobalMarginToSupplierProducts({
      admin,
      changedBy: auth.user.id,
      supplierUserId: id,
      marginPercent,
    });
    if (applied.error) return { error: applied.error };
    updated += applied.updated;
    publishedUpdated += applied.publishedUpdated;
  }

  bustPublishedCatalogCaches();
  const listed = await listAdminSupplierCatalogProducts();
  if (listed.error) {
    return {
      updated,
      publishedUpdated,
      marginPercent,
    };
  }

  return {
    updated,
    publishedUpdated,
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
      error:
        "Indica el porcentaje de ganancia de Alcéntimo en Margen global para aplicarlo a los productos.",
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
