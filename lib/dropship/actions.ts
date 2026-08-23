"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { revalidatePublicCatalogCache } from "@/lib/catalog/public-catalog-cache";
import {
  applyRetailPriceToProduct,
  loadRetailUsdByProductIds,
} from "@/lib/dropship/price-change";
import {
  defaultDropshipPricingSettings,
  normalizeDropshipPricingSettings,
  resolveDropshipImportRetailUsd,
  suggestRetailFromWholesaleCost,
} from "@/lib/dropship/margin";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { mergeStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { requireDropshipFeatureAccess } from "@/lib/dropship/feature-access";
import {
  allocateUniqueProductSlug,
  isProductSlugUniqueViolation,
  randomProductSlugSuffix,
} from "@/lib/products/allocate-product-slug";
import { assertCanCreateProduct } from "@/lib/plans/product-limit";
import { buildProductMetadata } from "@/lib/products/extra-fields";
import {
  buildImportCategoryCache,
  resolveOrCreateSupplierStoreCategory,
} from "@/lib/products/import-category";
import type { ProductVariantJson } from "@/lib/products/variants";
import { syncProductVariants } from "@/lib/products/sync-variants";
import { normalizeSupplierProductCategory } from "@/lib/supplier/categories";
import {
  normalizeSupplierProductVariants,
  supplierVariantsToCatalogJson,
} from "@/lib/supplier/variants";
import {
  listSupplierProductImages,
  supplierImageUrls,
} from "@/lib/supplier/product-images";
import { syncDefaultLocationStockFromVariant } from "@/lib/locations/sync-stock";
import { mirrorSupplierStockToLinkedStores } from "@/lib/dropship/supplier-stock";
import { fetchAllPagedRows } from "@/lib/supabase/fetch-all-rows";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DROPSHIP_SUPPLIER_PRODUCT_SELECT,
  applyDropshipVisibleProductFilter,
  isPublishedForDropship,
  mayoristaFromMarginPercent,
  parsePercentAmount,
  parseUsdAmount,
  resolvePrecioMayoristaUsd,
  resolveSuggestedRetailUsd,
} from "@/lib/supplier/wholesale-price";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

async function requireDropshipStore() {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error } as const;

  const feature = await requireDropshipFeatureAccess({
    email: auth.authUser.email,
  });
  if (!feature.ok) return { error: feature.error } as const;

  return { auth, supabase } as const;
}

function mapSupplierVariantsToCatalog(
  supplierVariants: Parameters<typeof supplierVariantsToCatalogJson>[0],
  basePriceUsd = 0,
): ProductVariantJson[] {
  return supplierVariantsToCatalogJson(supplierVariants, basePriceUsd).map(
    (variant) => ({
      ...variant,
      id: crypto.randomUUID(),
    }),
  );
}

async function upsertCatalogProductImages(
  client: SupabaseClient,
  productId: string,
  name: string,
  imageUrls: string[],
): Promise<string | undefined> {
  await client.from("product_images").delete().eq("product_id", productId);

  const urls = [
    ...new Set(
      imageUrls
        .map((url) => url.trim())
        .filter((url) => url.length > 0),
    ),
  ];
  if (urls.length === 0) return undefined;

  const { error } = await client.from("product_images").insert(
    urls.map((imageUrl, index) => ({
      product_id: productId,
      thumb_url: imageUrl,
      medium_url: imageUrl,
      full_url: imageUrl,
      is_primary: index === 0,
      alt_text: name,
      mime_type: "image/webp",
      sort_order: index,
    })),
  );

  return error?.message;
}

async function softDeleteImportedProduct(
  client: SupabaseClient,
  productId: string,
) {
  await client
    .from("products")
    .update({ is_deleted: true, is_active: false })
    .eq("id", productId);
}

function revalidateDropshipStoreCatalog(store: { id: string; slug: string }) {
  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard");
  revalidatePath(`/c/${store.slug}`);
  revalidatePublicCatalogCache({
    slug: store.slug,
    storeId: store.id,
  });
}

async function persistStoreDropshipMarginPercent(
  admin: SupabaseClient,
  storeId: string,
  settings: Awaited<ReturnType<typeof getStoreSettingsConfig>>,
  marginPercent: number,
): Promise<string | undefined> {
  const current = normalizeDropshipPricingSettings(settings.dropshipPricing);
  const dropship = {
    ...current,
    enabled: true,
    marginType: "percent" as const,
    marginValue: marginPercent,
  };
  const merged = mergeStoreSettingsConfig(settings, {
    dropshipPricing: dropship,
  });
  const { error } = await admin
    .from("store_settings")
    .upsert({ store_id: storeId, config: merged }, { onConflict: "store_id" });
  return error?.message;
}

async function nextProductSortOrder(
  client: SupabaseClient,
  storeId: string,
): Promise<number> {
  const { data } = await client
    .from("products")
    .select("sort_order")
    .eq("store_id", storeId)
    .eq("is_deleted", false)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (Number(data?.sort_order) || 0) - 1;
}

export type DropshipLinkRow = {
  id: string;
  productId: string;
  productName: string;
  supplierProductId: string;
  supplierProductTitle: string;
  supplierCostUsd: number;
  autoReprice: boolean;
  lastCostUsd: number | null;
  suggestedRetailUsd: number | null;
};

export type SupplierPriceAlertRow = {
  id: string;
  supplierProductTitle: string;
  productId: string | null;
  oldCostUsd: number;
  newCostUsd: number;
  suggestedRetailUsd: number | null;
  previousRetailUsd: number | null;
  status: string;
  createdAt: string;
};

export async function listStoreDropshipLinks(): Promise<
  ActionResult<{ links: DropshipLinkRow[] }>
> {
  const gate = await requireDropshipStore();
  if ("error" in gate) return { error: gate.error };
  const { auth } = gate;

  const admin = createAdminClient();
  const settings = await getStoreSettingsConfig(auth.store.id);
  const dropship = normalizeDropshipPricingSettings(settings.dropshipPricing);

  const { data, error } = await admin
    .from("store_dropship_links")
    .select(
      "id, product_id, supplier_product_id, auto_reprice, last_cost_usd, products(name), supplier_products(title, precio_mayorista, publication_status, catalog_visible, is_visible, is_active)",
    )
    .eq("store_id", auth.store.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const links: DropshipLinkRow[] = ((data as Record<string, unknown>[] | null) ?? []).map(
    (row) => {
      const product = row.products as { name?: string } | null;
      const supplier = row.supplier_products as {
        title?: string;
        precio_mayorista?: number | null;
        publication_status?: string;
        is_active?: boolean;
      } | null;
      const cost = resolvePrecioMayoristaUsd(supplier ?? {}) ?? 0;
      return {
        id: String(row.id),
        productId: String(row.product_id),
        productName: String(product?.name ?? "Producto"),
        supplierProductId: String(row.supplier_product_id),
        supplierProductTitle: String(supplier?.title ?? "Mayorista"),
        supplierCostUsd: cost,
        autoReprice: Boolean(row.auto_reprice),
        lastCostUsd:
          row.last_cost_usd != null ? Number(row.last_cost_usd) : null,
        suggestedRetailUsd: suggestRetailFromWholesaleCost(cost, dropship),
      };
    },
  );

  return { links };
}

export type MerchantSupplierCatalogProduct = {
  id: string;
  title: string;
  description: string;
  wholesalePriceUsd: number;
  suggestedRetailUsd: number | null;
  /** Precio de venta en la tienda si ya está importado; si no, el sugerido. */
  retailPriceUsd: number | null;
  stock: number;
  category: string;
  imageUrl: string | null;
  imageUrls: string[];
  variantCount: number;
  alreadyImported: boolean;
  linkedProductId: string | null;
};

export async function listActiveSupplierCatalogForMerchant(): Promise<
  ActionResult<{ products: MerchantSupplierCatalogProduct[] }>
> {
  const gate = await requireDropshipStore();
  if ("error" in gate) return { error: gate.error };
  const { auth } = gate;

  const admin = createAdminClient();
  const settings = await getStoreSettingsConfig(auth.store.id);
  const dropship = normalizeDropshipPricingSettings(settings.dropshipPricing);
  /** En Productos disponibles mostramos precio sugerido aunque aún no hayan tocado Ajustes. */
  const pricingForSuggest = dropship.enabled
    ? dropship
    : { ...defaultDropshipPricingSettings(), enabled: true };

  const pageSize = 500;
  const catalogRows: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await applyDropshipVisibleProductFilter(
      admin
        .from("supplier_products")
        .select(DROPSHIP_SUPPLIER_PRODUCT_SELECT),
    )
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) return { error: error.message };
    const chunk = (data as Record<string, unknown>[] | null) ?? [];
    catalogRows.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  const linksResult = await fetchAllPagedRows((from, to) =>
    admin
      .from("store_dropship_links")
      .select("supplier_product_id, product_id")
      .eq("store_id", auth.store.id)
      .order("supplier_product_id", { ascending: true })
      .range(from, to),
  );
  if (linksResult.error) return { error: linksResult.error };
  const links = linksResult.rows;

  const linkedBySupplier = new Map<string, string>();
  for (const row of (links as Record<string, unknown>[] | null) ?? []) {
    const supplierId = String(row.supplier_product_id ?? "");
    const productId = String(row.product_id ?? "");
    if (supplierId && productId) {
      linkedBySupplier.set(supplierId, productId);
    }
  }

  const galleryByProduct = await listSupplierProductImages(
    admin,
    catalogRows.map((row) => String(row.id)),
  );

  const linkedProductIds = [...new Set(linkedBySupplier.values())];
  const retailResult = await loadRetailUsdByProductIds(admin, linkedProductIds);
  if (retailResult.error) return { error: retailResult.error };

  const products: MerchantSupplierCatalogProduct[] = [];
  for (const row of catalogRows) {
    const id = String(row.id);
    const cost = resolvePrecioMayoristaUsd(row);
    if (cost == null) continue;
    const variants = normalizeSupplierProductVariants(row.variants);
    const linkedProductId = linkedBySupplier.get(id) ?? null;
    const coverUrl =
      typeof row.image_url === "string" && row.image_url.trim()
        ? row.image_url.trim()
        : null;
    const imageUrls = supplierImageUrls(
      galleryByProduct.get(id) ?? [],
      coverUrl,
    );
    const platformSuggestedRetailUsd = resolveSuggestedRetailUsd(row);
    const suggestedRetailUsd =
      platformSuggestedRetailUsd ??
      suggestRetailFromWholesaleCost(cost, pricingForSuggest);
    const storedRetail =
      linkedProductId != null
        ? (retailResult.prices.get(linkedProductId) ?? null)
        : null;

    products.push({
      id,
      title: String(row.title ?? ""),
      description: String(row.description ?? ""),
      wholesalePriceUsd: cost,
      suggestedRetailUsd,
      retailPriceUsd: storedRetail ?? suggestedRetailUsd,
      stock: Number(row.stock) || 0,
      category: normalizeSupplierProductCategory(row.category),
      imageUrl: imageUrls[0] ?? null,
      imageUrls,
      variantCount: variants.options.length,
      alreadyImported: linkedProductId != null,
      linkedProductId,
    });
  }

  products.sort((a, b) => a.title.localeCompare(b.title, "es"));
  return { products };
}

/**
 * Crea un producto en el catálogo de la tienda a partir de un SKU mayorista,
 * aplicando la regla de margen y vinculándolo para dropshipping.
 */
export async function importSupplierProductToStoreCatalog(
  supplierProductId: string,
  options?: { retailUsd?: number | string | null; skipRevalidate?: boolean },
): Promise<
  ActionResult<{
    ok: true;
    productId: string;
    retailUsd: number;
    productName: string;
    linkId: string;
  }>
> {
  try {
    const gate = await requireDropshipStore();
    if ("error" in gate) return { error: gate.error };
    const { auth } = gate;

    const supplierId = supplierProductId.trim();
    if (!supplierId) {
      return { error: "Selecciona un producto mayorista." };
    }

    const settings = await getStoreSettingsConfig(auth.store.id);
    let dropship = normalizeDropshipPricingSettings(settings.dropshipPricing);
    const admin = createAdminClient();

    if (!dropship.enabled) {
      dropship = {
        ...defaultDropshipPricingSettings(),
        enabled: true,
        marginType: dropship.marginType || "percent",
        marginValue:
          dropship.marginValue > 0
            ? dropship.marginValue
            : defaultDropshipPricingSettings().marginValue,
        autoApplyOnCostChange: dropship.autoApplyOnCostChange,
      };
      const merged = mergeStoreSettingsConfig(settings, {
        dropshipPricing: dropship,
      });
      const { error: settingsError } = await admin
        .from("store_settings")
        .upsert(
          { store_id: auth.store.id, config: merged },
          { onConflict: "store_id" },
        );
      if (settingsError) return { error: settingsError.message };
    }

    const { data: existingLink } = await admin
      .from("store_dropship_links")
      .select("id, product_id")
      .eq("store_id", auth.store.id)
      .eq("supplier_product_id", supplierId)
      .maybeSingle();

    if (existingLink) {
      return { error: "Este producto mayorista ya está en tu catálogo." };
    }

    const { data: supplierRow, error: supplierError } = await applyDropshipVisibleProductFilter(
      admin
        .from("supplier_products")
        .select(DROPSHIP_SUPPLIER_PRODUCT_SELECT)
        .eq("id", supplierId),
    )
      .maybeSingle();

    if (supplierError) return { error: supplierError.message };
    if (!supplierRow || !isPublishedForDropship(supplierRow as Record<string, unknown>)) {
      return { error: "Producto mayorista no disponible." };
    }

    const title = String(supplierRow.title ?? "").trim();
    if (!title) return { error: "El producto mayorista no tiene nombre." };

    const cost = resolvePrecioMayoristaUsd(supplierRow as Record<string, unknown>);
    if (cost == null) {
      return { error: "Producto mayorista no disponible." };
    }
    const overrideRetail = parseUsdAmount(options?.retailUsd, { min: 0 });
    const platformSuggestedRetailUsd = resolveSuggestedRetailUsd(
      supplierRow as Record<string, unknown>,
    );
    const retailUsd = resolveDropshipImportRetailUsd(
      cost,
      dropship,
      overrideRetail != null && overrideRetail > 0 ? overrideRetail : null,
      platformSuggestedRetailUsd,
    );
    if (retailUsd == null || retailUsd <= 0) {
      return {
        error:
          "No se pudo calcular un precio de venta válido. Revisa tu margen por defecto en Ajustes.",
      };
    }

    const productLimitCheck = await assertCanCreateProduct(auth.store.id);
    if (!productLimitCheck.ok) {
      return { error: productLimitCheck.error };
    }

    const supplierCategory = normalizeSupplierProductCategory(
      supplierRow.category,
    );
    const { data: storeCategories, error: categoriesError } = await admin
      .from("categories")
      .select("id, name, slug")
      .eq("store_id", auth.store.id);

    if (categoriesError) return { error: categoriesError.message };

    const categoryCache = buildImportCategoryCache(
      (storeCategories ?? []) as { id: string; name: string; slug: string }[],
    );
    const categoryResolved = await resolveOrCreateSupplierStoreCategory(
      admin,
      auth.store.id,
      supplierCategory,
      categoryCache,
    );
    if (categoryResolved.error || !categoryResolved.categoryId) {
      return {
        error:
          categoryResolved.error ??
          "No se pudo asignar la categoría del producto.",
      };
    }

    const description =
      typeof supplierRow.description === "string"
        ? supplierRow.description.trim().slice(0, 2000) || null
        : null;
    const stock = Math.max(0, Math.floor(Number(supplierRow.stock) || 0));
    const coverUrl =
      typeof supplierRow.image_url === "string" && supplierRow.image_url.trim()
        ? supplierRow.image_url.trim()
        : null;
    const galleryByProduct = await listSupplierProductImages(admin, [supplierId]);
    const imageUrls = supplierImageUrls(
      galleryByProduct.get(supplierId) ?? [],
      coverUrl,
    );
    const supplierVariants = normalizeSupplierProductVariants(
      supplierRow.variants,
    );
    const catalogVariants = mapSupplierVariantsToCatalog(
      supplierVariants,
      cost,
    );
    const metadata = buildProductMetadata(null, {}, []);
    const sortOrder = await nextProductSortOrder(admin, auth.store.id);

    let productSlug = "";
    let productId = "";

    for (let attempt = 0; attempt < 3; attempt++) {
      productSlug =
        attempt === 0
          ? await allocateUniqueProductSlug(admin, auth.store.id, title)
          : await allocateUniqueProductSlug(
              admin,
              auth.store.id,
              `${title}-${randomProductSlugSuffix(5)}`,
            );

      const { data: product, error: productError } = await admin
        .from("products")
        .insert({
          store_id: auth.store.id,
          category_id: categoryResolved.categoryId,
          name: title.slice(0, 120),
          slug: productSlug,
          short_description: description,
          description,
          metadata,
          sort_order: sortOrder,
          is_active: true,
          is_deleted: false,
        })
        .select("id")
        .single();

      if (!productError && product) {
        productId = product.id as string;
        break;
      }

      if (
        !productError ||
        !isProductSlugUniqueViolation(productError) ||
        attempt === 2
      ) {
        return {
          error:
            productError?.message ??
            "No se pudo crear el producto en tu catálogo.",
        };
      }
    }

    if (!productId) {
      return { error: "No se pudo crear el producto en tu catálogo." };
    }

    const rollback = async () => softDeleteImportedProduct(admin, productId);

    const sku = `${auth.store.slug}-${productSlug}`.slice(0, 80);
    const { data: variant, error: variantError } = await admin
      .from("product_variants")
      .insert({
        product_id: productId,
        sku,
        name: catalogVariants.length > 0 ? "Base" : "Estándar",
        stock_quantity: stock,
        low_stock_threshold: DEFAULT_LOW_STOCK_THRESHOLD,
        is_default: true,
        is_active: true,
      })
      .select("id")
      .single();

    if (variantError || !variant) {
      await rollback();
      return { error: variantError?.message ?? "No se pudo crear la variante." };
    }

    const variantId = variant.id as string;

    const { error: priceError } = await admin.from("product_prices").insert({
      variant_id: variantId,
      amount_usd: retailUsd,
    });

    if (priceError) {
      await rollback();
      return { error: priceError.message };
    }

    const locationSync = await syncDefaultLocationStockFromVariant(
      admin,
      auth.store.id,
      variantId,
      stock,
    );
    if (locationSync.error) {
      await rollback();
      return { error: locationSync.error };
    }

    if (catalogVariants.length > 0) {
      const synced = await syncProductVariants(admin, {
        productId,
        storeSlug: auth.store.slug,
        productSlug,
        basePriceUsd: retailUsd,
        lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
        variants: catalogVariants,
        defaultVariantId: variantId,
        storeId: auth.store.id,
      });
      if (synced.error) {
        await rollback();
        return { error: synced.error };
      }

      // Tras sync de variantes, restaurar stock espejo del mayorista en la base.
      await admin
        .from("product_variants")
        .update({ stock_quantity: stock })
        .eq("id", variantId);
      await syncDefaultLocationStockFromVariant(
        admin,
        auth.store.id,
        variantId,
        stock,
      );
    }

    if (imageUrls.length > 0) {
      const imageError = await upsertCatalogProductImages(
        admin,
        productId,
        title,
        imageUrls,
      );
      if (imageError) {
        // No revertir el producto por la foto: el catálogo queda usable.
        console.error(
          "[dropship-import] imagen no guardada:",
          imageError,
          productId,
        );
      }
    }

    const { data: linkRow, error: linkError } = await admin
      .from("store_dropship_links")
      .insert({
        store_id: auth.store.id,
        product_id: productId,
        supplier_product_id: supplierId,
        auto_reprice: dropship.autoApplyOnCostChange,
        last_cost_usd: cost,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (linkError || !linkRow) {
      await rollback();
      return {
        error:
          linkError?.code === "23505"
            ? "Este producto mayorista ya está en tu catálogo."
            : linkError?.message ?? "No se pudo vincular el producto mayorista.",
      };
    }

    await mirrorSupplierStockToLinkedStores(admin, supplierId, stock);

    if (!options?.skipRevalidate) {
      revalidateDropshipStoreCatalog(auth.store);
    }

    return {
      ok: true as const,
      productId,
      retailUsd,
      productName: title.slice(0, 120),
      linkId: String(linkRow.id),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo importar el producto mayorista.";
    return { error: message };
  }
}

/**
 * Actualiza el precio de venta de un SKU ya importado.
 * Ese monto es el que ven los clientes en la vitrina pública.
 */
export async function setDropshipCatalogRetailPrice(input: {
  supplierProductId: string;
  retailUsd: number | string;
}): Promise<
  ActionResult<{
    ok: true;
    supplierProductId: string;
    retailUsd: number;
    linkedProductId: string;
  }>
> {
  const gate = await requireDropshipStore();
  if ("error" in gate) return { error: gate.error };
  const { auth } = gate;

  const supplierProductId = input.supplierProductId.trim();
  const retailUsd = parseUsdAmount(input.retailUsd, { min: 0 });
  if (!supplierProductId) return { error: "Producto inválido." };
  if (retailUsd == null) {
    return { error: "Indica un precio de venta válido." };
  }

  const admin = createAdminClient();
  const { data: link, error: linkError } = await admin
    .from("store_dropship_links")
    .select("id, product_id")
    .eq("store_id", auth.store.id)
    .eq("supplier_product_id", supplierProductId)
    .maybeSingle();

  if (linkError) return { error: linkError.message };
  const linkedProductId =
    link && typeof link.product_id === "string" ? link.product_id : null;
  if (!linkedProductId) {
    return { error: "Añade el producto a tu tienda para guardar el precio." };
  }

  const applied = await applyRetailPriceToProduct(
    admin,
    linkedProductId,
    retailUsd,
  );
  if (!applied.ok) {
    return { error: applied.error ?? "No se pudo guardar el precio de venta." };
  }

  revalidateDropshipStoreCatalog(auth.store);
  return {
    ok: true as const,
    supplierProductId,
    retailUsd,
    linkedProductId,
  };
}

/**
 * Aplica un % de ganancia sobre el precio mayorista.
 * Si hay IDs, actualiza esos SKU (y los añade a la tienda si faltan).
 * Si no hay IDs, actualiza todos los que ya están en la tienda.
 * El % queda como ganancia por defecto para productos nuevos.
 */
export async function applyDropshipCatalogMarginPercent(input: {
  marginPercent: number | string;
  supplierProductIds?: string[] | null;
}): Promise<
  ActionResult<{
    ok: true;
    updated: number;
    imported: number;
    skipped: number;
    marginPercent: number;
  }>
> {
  const gate = await requireDropshipStore();
  if ("error" in gate) return { error: gate.error };
  const { auth } = gate;

  const marginPercent = parsePercentAmount(input.marginPercent, {
    min: 0,
    max: 1000,
  });
  if (marginPercent == null) {
    return { error: "Indica un porcentaje de ganancia válido (0% a 1000%)." };
  }

  const admin = createAdminClient();
  const settings = await getStoreSettingsConfig(auth.store.id);
  const persistError = await persistStoreDropshipMarginPercent(
    admin,
    auth.store.id,
    settings,
    marginPercent,
  );
  if (persistError) return { error: persistError };

  const requestedIds = [
    ...new Set(
      (input.supplierProductIds ?? [])
        .map((id) => String(id ?? "").trim())
        .filter(Boolean),
    ),
  ];

  let targetIds = requestedIds;
  if (targetIds.length === 0) {
    const linksResult = await fetchAllPagedRows((from, to) =>
      admin
        .from("store_dropship_links")
        .select("supplier_product_id")
        .eq("store_id", auth.store.id)
        .order("supplier_product_id", { ascending: true })
        .range(from, to),
    );
    if (linksResult.error) return { error: linksResult.error };
    targetIds = [
      ...new Set(
        linksResult.rows
          .map((row) => String(row.supplier_product_id ?? "").trim())
          .filter(Boolean),
      ),
    ];
  }

  if (targetIds.length === 0) {
    return {
      error:
        "Añade productos a tu tienda o márcalos en el catálogo para aplicar el %.",
    };
  }

  const supplierById = new Map<string, Record<string, unknown>>();
  const IN_CHUNK = 100;
  for (let index = 0; index < targetIds.length; index += IN_CHUNK) {
    const chunk = targetIds.slice(index, index + IN_CHUNK);
    const { data, error } = await applyDropshipVisibleProductFilter(
      admin
        .from("supplier_products")
        .select(DROPSHIP_SUPPLIER_PRODUCT_SELECT)
        .in("id", chunk),
    );
    if (error) return { error: error.message };
    for (const row of (data as Record<string, unknown>[] | null) ?? []) {
      const id = String(row.id ?? "");
      if (id) supplierById.set(id, row);
    }
  }

  const linkBySupplier = new Map<string, string>();
  for (let index = 0; index < targetIds.length; index += IN_CHUNK) {
    const chunk = targetIds.slice(index, index + IN_CHUNK);
    const { data, error } = await admin
      .from("store_dropship_links")
      .select("supplier_product_id, product_id")
      .eq("store_id", auth.store.id)
      .in("supplier_product_id", chunk);
    if (error) return { error: error.message };
    for (const row of (data as Record<string, unknown>[] | null) ?? []) {
      const supplierId = String(row.supplier_product_id ?? "");
      const productId = String(row.product_id ?? "");
      if (supplierId && productId) linkBySupplier.set(supplierId, productId);
    }
  }

  let updated = 0;
  let imported = 0;
  let skipped = 0;
  let lastError: string | null = null;

  for (const supplierProductId of targetIds) {
    const row = supplierById.get(supplierProductId);
    if (!row || !isPublishedForDropship(row)) {
      skipped += 1;
      continue;
    }
    const mayorista = resolvePrecioMayoristaUsd(row);
    if (mayorista == null) {
      skipped += 1;
      continue;
    }
    const retailUsd = mayoristaFromMarginPercent(mayorista, marginPercent);
    const linkedProductId = linkBySupplier.get(supplierProductId) ?? null;

    if (linkedProductId) {
      const applied = await applyRetailPriceToProduct(
        admin,
        linkedProductId,
        retailUsd,
      );
      if (!applied.ok) {
        skipped += 1;
        lastError = applied.error ?? lastError;
        continue;
      }
      updated += 1;
      continue;
    }

    const created = await importSupplierProductToStoreCatalog(
      supplierProductId,
      { retailUsd, skipRevalidate: true },
    );
    if (created.error || !created.ok) {
      skipped += 1;
      lastError = created.error ?? lastError;
      continue;
    }
    updated += 1;
    imported += 1;
  }

  revalidateDropshipStoreCatalog(auth.store);

  if (updated === 0) {
    return {
      error:
        lastError ??
        "No se pudo aplicar el porcentaje a ningún producto de tu tienda.",
    };
  }

  return {
    ok: true as const,
    updated,
    imported,
    skipped,
    marginPercent,
  };
}

export async function linkStoreDropshipProduct(input: {
  productId: string;
  supplierProductId: string;
  autoReprice?: boolean;
}): Promise<ActionResult<{ linkId: string }>> {
  const gate = await requireDropshipStore();
  if ("error" in gate) return { error: gate.error };
  const { auth } = gate;

  const productId = input.productId.trim();
  const supplierProductId = input.supplierProductId.trim();
  if (!productId || !supplierProductId) {
    return { error: "Selecciona producto de tienda y producto mayorista." };
  }

  const admin = createAdminClient();

  const { data: product } = await admin
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("store_id", auth.store.id)
    .maybeSingle();
  if (!product) return { error: "Producto de tienda no encontrado." };

  const { data: supplier } = await applyDropshipVisibleProductFilter(
    admin
      .from("supplier_products")
      .select("id, precio_mayorista, stock, is_active, publication_status, catalog_visible, is_visible")
      .eq("id", supplierProductId),
  )
    .maybeSingle();
  if (!supplier || !isPublishedForDropship(supplier as Record<string, unknown>)) {
    return { error: "Producto mayorista no disponible." };
  }

  const cost = resolvePrecioMayoristaUsd(supplier as Record<string, unknown>);
  if (cost == null) return { error: "Producto mayorista no disponible." };
  const supplierStock = Math.max(0, Math.floor(Number(supplier.stock) || 0));

  const { data, error } = await admin
    .from("store_dropship_links")
    .upsert(
      {
        store_id: auth.store.id,
        product_id: productId,
        supplier_product_id: supplierProductId,
        auto_reprice: Boolean(input.autoReprice),
        last_cost_usd: cost,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id" },
    )
    .select("id")
    .single();

  if (error) return { error: error.message };

  await mirrorSupplierStockToLinkedStores(admin, supplierProductId, supplierStock);

  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/catalogo");
  revalidatePublicCatalogCache({
    slug: auth.store.slug,
    storeId: auth.store.id,
  });
  return { linkId: String(data.id) };
}

export async function unlinkStoreDropshipProduct(
  linkId: string,
): Promise<ActionResult> {
  const gate = await requireDropshipStore();
  if ("error" in gate) return { error: gate.error };
  const { auth } = gate;

  const admin = createAdminClient();
  const { data: link, error: linkError } = await admin
    .from("store_dropship_links")
    .select("id, product_id")
    .eq("id", linkId.trim())
    .eq("store_id", auth.store.id)
    .maybeSingle();

  if (linkError) return { error: linkError.message };
  if (!link) return { error: "Vínculo no encontrado." };

  const productId =
    typeof link.product_id === "string" ? link.product_id : null;

  const { error } = await admin
    .from("store_dropship_links")
    .delete()
    .eq("id", String(link.id))
    .eq("store_id", auth.store.id);

  if (error) return { error: error.message };

  if (productId) {
    await admin
      .from("products")
      .update({
        is_active: false,
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .eq("store_id", auth.store.id);
  }

  revalidatePath("/dashboard/ajustes");
  revalidatePath("/dashboard/catalogo");
  revalidatePath(`/c/${auth.store.slug}`);
  revalidatePublicCatalogCache({
    slug: auth.store.slug,
    storeId: auth.store.id,
  });
  return {};
}

/** Quita del catálogo de la tienda un producto importado del hub mayorista. */
export async function removeSupplierProductFromStoreCatalog(
  supplierProductId: string,
): Promise<ActionResult<{ ok: true }>> {
  const gate = await requireDropshipStore();
  if ("error" in gate) return { error: gate.error };
  const { auth } = gate;

  const supplierId = supplierProductId.trim();
  if (!supplierId) return { error: "Producto inválido." };

  const admin = createAdminClient();
  const { data: link, error: linkError } = await admin
    .from("store_dropship_links")
    .select("id, product_id")
    .eq("store_id", auth.store.id)
    .eq("supplier_product_id", supplierId)
    .maybeSingle();

  if (linkError) return { error: linkError.message };
  if (!link) return { error: "Este producto no está en tu catálogo." };

  const unlink = await unlinkStoreDropshipProduct(String(link.id));
  if (unlink.error) return { error: unlink.error };

  return { ok: true };
}

export async function listUnreadSupplierPriceAlerts(): Promise<
  ActionResult<{ alerts: SupplierPriceAlertRow[]; unreadCount: number }>
> {
  const gate = await requireDropshipStore();
  // Feature oculta para comerciantes: sin alertas ni errores en UI.
  if ("error" in gate) {
    return { alerts: [], unreadCount: 0 };
  }
  const { auth } = gate;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("supplier_price_change_alerts")
    .select(
      "id, supplier_product_title, product_id, old_cost_usd, new_cost_usd, suggested_retail_usd, previous_retail_usd, status, created_at",
    )
    .eq("store_id", auth.store.id)
    .in("status", ["unread", "read"])
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return { error: error.message };

  const alerts: SupplierPriceAlertRow[] = (
    (data as Record<string, unknown>[] | null) ?? []
  ).map((row) => ({
    id: String(row.id),
    supplierProductTitle: String(row.supplier_product_title ?? ""),
    productId:
      typeof row.product_id === "string" && row.product_id
        ? row.product_id
        : null,
    oldCostUsd: Number(row.old_cost_usd) || 0,
    newCostUsd: Number(row.new_cost_usd) || 0,
    suggestedRetailUsd:
      row.suggested_retail_usd != null
        ? Number(row.suggested_retail_usd)
        : null,
    previousRetailUsd:
      row.previous_retail_usd != null
        ? Number(row.previous_retail_usd)
        : null,
    status: String(row.status ?? "unread"),
    createdAt: String(row.created_at ?? ""),
  }));

  return {
    alerts,
    unreadCount: alerts.filter((alert) => alert.status === "unread").length,
  };
}

export async function dismissSupplierPriceAlert(
  alertId: string,
): Promise<ActionResult> {
  const gate = await requireDropshipStore();
  if ("error" in gate) return { error: gate.error };
  const { auth } = gate;

  const admin = createAdminClient();
  const { error } = await admin
    .from("supplier_price_change_alerts")
    .update({
      status: "dismissed",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", alertId.trim())
    .eq("store_id", auth.store.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/catalogo");
  return {};
}

export async function applySuggestedPriceFromAlert(
  alertId: string,
): Promise<ActionResult> {
  const gate = await requireDropshipStore();
  if ("error" in gate) return { error: gate.error };
  const { auth } = gate;

  const admin = createAdminClient();
  const { data: alert, error } = await admin
    .from("supplier_price_change_alerts")
    .select(
      "id, product_id, suggested_retail_usd, new_cost_usd, store_id",
    )
    .eq("id", alertId.trim())
    .eq("store_id", auth.store.id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!alert) return { error: "Alerta no encontrada." };

  const productId =
    typeof alert.product_id === "string" ? alert.product_id : null;
  if (!productId) {
    return { error: "La alerta no está vinculada a un producto de tu tienda." };
  }

  let suggested =
    alert.suggested_retail_usd != null
      ? Number(alert.suggested_retail_usd)
      : null;

  if (suggested == null) {
    const settings = await getStoreSettingsConfig(auth.store.id);
    const dropship = normalizeDropshipPricingSettings(settings.dropshipPricing);
    suggested = suggestRetailFromWholesaleCost(
      Number(alert.new_cost_usd) || 0,
      dropship,
    );
  }

  if (suggested == null) {
    return {
      error:
        "Configura una regla de margen en Ajustes → Dropshipping para calcular el precio sugerido.",
    };
  }

  const applied = await applyRetailPriceToProduct(admin, productId, suggested);
  if (!applied.ok) return { error: applied.error };

  await admin
    .from("supplier_price_change_alerts")
    .update({
      status: "applied",
      suggested_retail_usd: suggested,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", alertId.trim())
    .eq("store_id", auth.store.id);

  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  revalidatePublicCatalogCache({
    slug: auth.store.slug,
    storeId: auth.store.id,
  });
  return {};
}
