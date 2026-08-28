"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { revalidatePublicCatalogCache } from "@/lib/catalog/public-catalog-cache";
import {
  defaultDropshipPricingSettings,
  normalizeDropshipPricingSettings,
  resolveDropshipImportRetailUsd,
  type DropshipPricingSettings,
} from "@/lib/dropship/margin";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { mergeStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { requireDropshipFeatureAccess } from "@/lib/dropship/feature-access";
import {
  buildProductSlugWithSuffix,
  randomProductSlugSuffix,
  shortProductSlugBase,
} from "@/lib/products/allocate-product-slug";
import { getStoreProductLimitContext } from "@/lib/plans/product-limit";
import { getProductLimitErrorMessage } from "@/src/config/plans";
import { buildProductMetadata } from "@/lib/products/extra-fields";
import {
  buildImportCategoryCache,
  resolveOrCreateSupplierStoreCategory,
  type ImportCategoryCache,
} from "@/lib/products/import-category";
import type { ProductVariantJson } from "@/lib/products/variants";
import { syncProductVariants } from "@/lib/products/sync-variants";
import { getDefaultLocationId } from "@/lib/locations/sync-stock";
import {
  isSupplierProductCategory,
  normalizeSupplierProductCategory,
  supplierCategoryLabel,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";
import {
  normalizeSupplierProductVariants,
  supplierVariantsToCatalogJson,
  type SupplierProductVariants,
} from "@/lib/supplier/variants";
import {
  listSupplierProductImages,
  supplierImageUrls,
} from "@/lib/supplier/product-images";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllPagedRows } from "@/lib/supabase/fetch-all-rows";
import {
  DROPSHIP_SUPPLIER_PRODUCT_SELECT,
  applyDropshipVisibleProductFilter,
  isPublishedForDropship,
  parseUsdAmount,
  resolvePrecioMayoristaUsd,
  resolveSuggestedRetailUsd,
} from "@/lib/supplier/wholesale-price";

const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const SUPPLIER_PAGE_SIZE = 500;
const INSERT_CHUNK_SIZE = 40;

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

export type BulkImportSupplierProductsResult = {
  imported: number;
  alreadyInStore: number;
  skippedLimit: number;
  failed: number;
  importedSupplierIds: string[];
  category: SupplierProductCategory | null;
  message: string;
};

type SupplierCatalogRow = {
  id: string;
  title: string;
  description: string | null;
  wholesalePriceUsd: number;
  platformSuggestedRetailUsd: number | null;
  stock: number;
  category: SupplierProductCategory;
  imageUrl: string | null;
  imageUrls: string[];
  variants: SupplierProductVariants;
};

function mapSupplierVariantsToCatalog(
  supplierVariants: SupplierProductVariants,
  basePriceUsd = 0,
): ProductVariantJson[] {
  return supplierVariantsToCatalogJson(supplierVariants, basePriceUsd).map(
    (variant) => ({
      ...variant,
      id: crypto.randomUUID(),
    }),
  );
}

function allocateSlug(title: string, used: Set<string>): string {
  const base = shortProductSlugBase(title);
  for (let i = 0; i < 12; i++) {
    const candidate = buildProductSlugWithSuffix(base);
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  const fallback = buildProductSlugWithSuffix(
    base,
    `${Date.now().toString(36)}${randomProductSlugSuffix(3)}`,
  );
  used.add(fallback);
  return fallback;
}

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

async function fetchAllActiveSupplierProducts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): Promise<{ rows?: SupplierCatalogRow[]; error?: string }> {
  const rows: SupplierCatalogRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await applyDropshipVisibleProductFilter(
      admin
        .from("supplier_products")
        .select(DROPSHIP_SUPPLIER_PRODUCT_SELECT),
    )
      .order("id", { ascending: true })
      .range(from, from + SUPPLIER_PAGE_SIZE - 1);

    if (error) return { error: error.message };

    const chunk = (data as Record<string, unknown>[] | null) ?? [];
    for (const row of chunk) {
      const title = String(row.title ?? "").trim();
      if (!title) continue;
      if (!isPublishedForDropship(row)) continue;
      const wholesalePriceUsd = resolvePrecioMayoristaUsd(row);
      if (wholesalePriceUsd == null) continue;
      const imageUrl =
        typeof row.image_url === "string" && row.image_url.trim()
          ? row.image_url.trim()
          : null;
      rows.push({
        id: String(row.id),
        title,
        description:
          typeof row.description === "string"
            ? row.description.trim().slice(0, 2000) || null
            : null,
        wholesalePriceUsd,
        platformSuggestedRetailUsd: resolveSuggestedRetailUsd(row),
        stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
        category: normalizeSupplierProductCategory(row.category),
        imageUrl,
        imageUrls: imageUrl ? [imageUrl] : [],
        variants: normalizeSupplierProductVariants(row.variants),
      });
    }

    if (chunk.length < SUPPLIER_PAGE_SIZE) break;
    from += SUPPLIER_PAGE_SIZE;
  }

  const galleryByProduct = await listSupplierProductImages(
    admin,
    rows.map((row) => row.id),
  );
  for (const row of rows) {
    const urls = supplierImageUrls(
      galleryByProduct.get(row.id) ?? [],
      row.imageUrl,
    );
    row.imageUrls = urls;
    row.imageUrl = urls[0] ?? null;
  }

  return { rows };
}

function buildSuccessMessage(input: {
  imported: number;
  alreadyInStore: number;
  skippedLimit: number;
  failed: number;
  categoryLabel: string | null;
}): string {
  const scope = input.categoryLabel
    ? ` de ${input.categoryLabel}`
    : "";

  if (input.imported === 0 && input.skippedLimit === 0 && input.failed === 0) {
    return input.categoryLabel
      ? `Todos los productos de ${input.categoryLabel} ya están en tu tienda.`
      : "Todos los productos disponibles ya están en tu tienda.";
  }

  const parts: string[] = [];
  if (input.imported > 0) {
    parts.push(
      input.imported === 1
        ? `Se añadió 1 producto${scope} a tu tienda.`
        : `Se añadieron ${input.imported} productos${scope} a tu tienda.`,
    );
  }
  if (input.skippedLimit > 0) {
    parts.push(
      `Tu plan no permite más productos (${input.skippedLimit} no se cargaron).`,
    );
  }
  if (input.failed > 0) {
    parts.push(
      `${input.failed} no se pudieron importar. Intenta de nuevo con los que faltan.`,
    );
  }
  return parts.join(" ");
}

async function ensureDropshipPricing(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  storeId: string,
  settings: Awaited<ReturnType<typeof getStoreSettingsConfig>>,
): Promise<ActionResult<{ dropship: DropshipPricingSettings }>> {
  let dropship = normalizeDropshipPricingSettings(settings.dropshipPricing);
  if (dropship.enabled) return { dropship };

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
  const { error } = await admin
    .from("store_settings")
    .upsert({ store_id: storeId, config: merged }, { onConflict: "store_id" });
  if (error) return { error: error.message };
  return { dropship };
}

async function softDeleteProducts(
  admin: SupabaseClient,
  storeId: string,
  productIds: string[],
) {
  if (productIds.length === 0) return;
  await admin
    .from("products")
    .update({ is_deleted: true, is_active: false })
    .eq("store_id", storeId)
    .in("id", productIds);
}

/** Publica en la vitrina: activos, no borrados y anclados a la tienda. */
async function publishImportedProducts(
  admin: SupabaseClient,
  storeId: string,
  productIds: string[],
) {
  if (productIds.length === 0) return;
  await admin
    .from("products")
    .update({
      store_id: storeId,
      is_active: true,
      is_deleted: false,
      updated_at: new Date().toISOString(),
    })
    .in("id", productIds);

  await admin
    .from("product_variants")
    .update({ is_active: true })
    .in("product_id", productIds)
    .eq("is_default", true);
}

/**
 * Importa en lote los productos mayoristas activos a la tienda del dropshipper.
 * `category` limita a una categoría del hub (electrónica, otros, …).
 */
export async function importSupplierProductsBulkToStore(input?: {
  category?: string | null;
  /** Precio de venta fijado en la UI por producto (opcional). */
  retailBySupplierId?: Record<string, number | string | null> | null;
}): Promise<ActionResult<BulkImportSupplierProductsResult>> {
  try {
    const gate = await requireDropshipStore();
    if ("error" in gate) return { error: gate.error };
    const { auth } = gate;

    const categoryRaw = input?.category?.trim() || null;
    let category: SupplierProductCategory | null = null;
    if (categoryRaw) {
      if (!isSupplierProductCategory(categoryRaw)) {
        return { error: "Elige una categoría válida del catálogo mayorista." };
      }
      category = categoryRaw;
    }

    const admin = createAdminClient();
    const settings = await getStoreSettingsConfig(auth.store.id);
    const priced = await ensureDropshipPricing(admin, auth.store.id, settings);
    if (priced.error || !priced.dropship) {
      return { error: priced.error ?? "No se pudo activar el margen de venta." };
    }
    const dropship = priced.dropship;

    const [catalogResult, linksResult] = await Promise.all([
      fetchAllActiveSupplierProducts(admin),
      fetchAllPagedRows((from, to) =>
        admin
          .from("store_dropship_links")
          .select("supplier_product_id")
          .eq("store_id", auth.store.id)
          .order("supplier_product_id", { ascending: true })
          .range(from, to),
      ),
    ]);

    if (catalogResult.error) return { error: catalogResult.error };
    if (linksResult.error) return { error: linksResult.error };

    const supplierRows = catalogResult.rows;
    const alreadyLinked = new Set<string>();
    for (const row of linksResult.rows) {
      const id = String(row.supplier_product_id ?? "");
      if (id) alreadyLinked.add(id);
    }

    const eligible = (supplierRows ?? []).filter((row) => {
      if (category && row.category !== category) return false;
      return !alreadyLinked.has(row.id);
    });
    const alreadyInStore = (supplierRows ?? []).filter((row) => {
      if (category && row.category !== category) return false;
      return alreadyLinked.has(row.id);
    }).length;

    if (eligible.length === 0) {
      const empty: BulkImportSupplierProductsResult = {
        imported: 0,
        alreadyInStore,
        skippedLimit: 0,
        failed: 0,
        importedSupplierIds: [],
        category,
        message: buildSuccessMessage({
          imported: 0,
          alreadyInStore,
          skippedLimit: 0,
          failed: 0,
          categoryLabel: category ? supplierCategoryLabel(category) : null,
        }),
      };
      return empty;
    }

    const limitContext = await getStoreProductLimitContext(auth.store.id);
    if (!limitContext.canCreateMore) {
      return {
        error: getProductLimitErrorMessage(limitContext, {
          ...limitContext.trial,
        }),
      };
    }

    const remaining =
      limitContext.remainingSlots == null
        ? eligible.length
        : Math.max(0, limitContext.remainingSlots);
    const toImport = eligible.slice(0, remaining);
    const skippedLimit = eligible.length - toImport.length;

    const [slugResult, { data: sortRow }, categoriesResult] = await Promise.all([
      fetchAllPagedRows((from, to) =>
        admin
          .from("products")
          .select("slug")
          .eq("store_id", auth.store.id)
          .order("slug", { ascending: true })
          .range(from, to),
      ),
      admin
        .from("products")
        .select("sort_order")
        .eq("store_id", auth.store.id)
        .eq("is_deleted", false)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle(),
      fetchAllPagedRows((from, to) =>
        admin
          .from("categories")
          .select("id, name, slug")
          .eq("store_id", auth.store.id)
          .order("slug", { ascending: true })
          .range(from, to),
      ),
    ]);

    if (slugResult.error) return { error: slugResult.error };
    if (categoriesResult.error) return { error: categoriesResult.error };

    const usedSlugs = new Set<string>();
    for (const row of slugResult.rows) {
      const slug = String(row.slug ?? "");
      if (slug) usedSlugs.add(slug);
    }

    let nextSort = (Number(sortRow?.sort_order) || 0) - 1;
    const categoryCache: ImportCategoryCache = buildImportCategoryCache(
      categoriesResult.rows as { id: string; name: string; slug: string }[],
    );
    const defaultLocationId = await getDefaultLocationId(admin, auth.store.id);
    const emptyMetadata = buildProductMetadata(null, {}, []);
    const now = new Date().toISOString();

    const importedSupplierIds: string[] = [];
    let failed = 0;
    let lastError: string | null = null;

    const retailOverrides = input?.retailBySupplierId ?? {};

    for (let offset = 0; offset < toImport.length; offset += INSERT_CHUNK_SIZE) {
      const chunk = toImport.slice(offset, offset + INSERT_CHUNK_SIZE);
      const prepared: Array<{
        supplier: SupplierCatalogRow;
        productId: string;
        variantId: string;
        slug: string;
        categoryId: string;
        retailUsd: number;
        catalogVariants: ProductVariantJson[];
      }> = [];

      for (const supplier of chunk) {
        const overrideRaw = retailOverrides[supplier.id];
        const overrideParsed = parseUsdAmount(overrideRaw, { min: 0 });
        const individualRetail =
          overrideParsed != null && overrideParsed > 0 ? overrideParsed : null;
        const retailUsd = resolveDropshipImportRetailUsd(
          supplier.wholesalePriceUsd,
          dropship,
          individualRetail,
          supplier.platformSuggestedRetailUsd,
        );
        if (retailUsd == null || retailUsd <= 0) {
          failed += 1;
          continue;
        }
        const categoryResolved = await resolveOrCreateSupplierStoreCategory(
          admin,
          auth.store.id,
          supplier.category,
          categoryCache,
        );
        if (categoryResolved.error || !categoryResolved.categoryId) {
          failed += 1;
          continue;
        }
        prepared.push({
          supplier,
          productId: crypto.randomUUID(),
          variantId: crypto.randomUUID(),
          slug: allocateSlug(supplier.title, usedSlugs),
          categoryId: categoryResolved.categoryId,
          retailUsd,
          catalogVariants: mapSupplierVariantsToCatalog(
            supplier.variants,
            supplier.wholesalePriceUsd,
          ),
        });
      }

      if (prepared.length === 0) continue;

      const productIds = prepared.map((item) => item.productId);
      const { error: productsError } = await admin.from("products").insert(
        prepared.map((item) => {
          const sortOrder = nextSort;
          nextSort -= 1;
          return {
            id: item.productId,
            store_id: auth.store.id,
            category_id: item.categoryId,
            name: item.supplier.title.slice(0, 120),
            slug: item.slug,
            short_description: item.supplier.description,
            description: item.supplier.description,
            metadata: emptyMetadata,
            sort_order: sortOrder,
            is_active: true,
            is_deleted: false,
          };
        }),
      );

      if (productsError) {
        lastError = productsError.message;
        console.error("[dropship-bulk-import] products", productsError.message);
        failed += prepared.length;
        continue;
      }

      const { error: variantsError } = await admin.from("product_variants").insert(
        prepared.map((item) => ({
          id: item.variantId,
          product_id: item.productId,
          sku: `${auth.store.slug}-${item.slug}`.slice(0, 80),
          name: item.catalogVariants.length > 0 ? "Base" : "Estándar",
          stock_quantity: item.supplier.stock,
          low_stock_threshold: DEFAULT_LOW_STOCK_THRESHOLD,
          is_default: true,
          is_active: true,
        })),
      );

      if (variantsError) {
        lastError = variantsError.message;
        console.error("[dropship-bulk-import] variants", variantsError.message);
        await softDeleteProducts(admin, auth.store.id, productIds);
        failed += prepared.length;
        continue;
      }

      const { error: pricesError } = await admin.from("product_prices").insert(
        prepared.map((item) => ({
          variant_id: item.variantId,
          amount_usd: item.retailUsd,
        })),
      );

      if (pricesError) {
        lastError = pricesError.message;
        console.error("[dropship-bulk-import] prices", pricesError.message);
        await softDeleteProducts(admin, auth.store.id, productIds);
        failed += prepared.length;
        continue;
      }

      // Al insertar variantes, el trigger `trg_ensure_variant_location_stock`
      // (y el espejo a la sede default) ya crea las filas. Un INSERT plano
      // choca con UNIQUE (variant_id, location_id) y abortaba todo el lote.
      if (defaultLocationId) {
        const { error: stockError } = await admin
          .from("variant_location_stock")
          .upsert(
            prepared.map((item) => ({
              variant_id: item.variantId,
              location_id: defaultLocationId,
              stock_quantity: item.supplier.stock,
              reserved_quantity: 0,
            })),
            { onConflict: "variant_id,location_id" },
          );
        if (stockError) {
          console.error(
            "[dropship-bulk-import] stock sede",
            stockError.message,
          );
        }
      }

      const images = prepared.flatMap((item) =>
        item.supplier.imageUrls.map((imageUrl, index) => ({
          product_id: item.productId,
          thumb_url: imageUrl,
          medium_url: imageUrl,
          full_url: imageUrl,
          is_primary: index === 0,
          alt_text: item.supplier.title,
          mime_type: "image/webp",
          sort_order: index,
        })),
      );
      if (images.length > 0) {
        for (let offset = 0; offset < images.length; offset += INSERT_CHUNK_SIZE) {
          const chunk = images.slice(offset, offset + INSERT_CHUNK_SIZE);
          const { error: imageError } = await admin
            .from("product_images")
            .insert(chunk);
          if (imageError) {
            console.error("[dropship-bulk-import] imágenes", imageError.message);
            break;
          }
        }
      }

      const { error: linksError } = await admin.from("store_dropship_links").insert(
        prepared.map((item) => ({
          store_id: auth.store.id,
          product_id: item.productId,
          supplier_product_id: item.supplier.id,
          auto_reprice: dropship.autoApplyOnCostChange,
          last_cost_usd: item.supplier.wholesalePriceUsd,
          updated_at: now,
        })),
      );

      if (linksError) {
        lastError = linksError.message;
        console.error("[dropship-bulk-import] links", linksError.message);
        await softDeleteProducts(admin, auth.store.id, productIds);
        failed += prepared.length;
        continue;
      }

      for (const item of prepared) {
        if (item.catalogVariants.length === 0) continue;
        const synced = await syncProductVariants(admin, {
          productId: item.productId,
          storeSlug: auth.store.slug,
          productSlug: item.slug,
          basePriceUsd: item.retailUsd,
          lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
          variants: item.catalogVariants,
          defaultVariantId: item.variantId,
          storeId: auth.store.id,
        });
        if (synced.error) {
          console.error(
            "[dropship-bulk-import] variantes",
            item.productId,
            synced.error,
          );
        } else {
          await admin
            .from("product_variants")
            .update({ stock_quantity: item.supplier.stock })
            .eq("id", item.variantId);
        }
      }

      await publishImportedProducts(admin, auth.store.id, productIds);

      importedSupplierIds.push(...prepared.map((item) => item.supplier.id));
    }

    revalidatePath("/dashboard/ajustes");
    revalidatePath("/dashboard/catalogo");
    revalidatePath("/dashboard/inventario");
    revalidatePath("/dashboard");
    revalidatePath(`/c/${auth.store.slug}`);
    revalidatePath(`/tienda/${auth.store.slug}`);
    revalidatePublicCatalogCache({
      slug: auth.store.slug,
      storeId: auth.store.id,
    });

    const result: BulkImportSupplierProductsResult = {
      imported: importedSupplierIds.length,
      alreadyInStore,
      skippedLimit,
      failed,
      importedSupplierIds,
      category,
      message: buildSuccessMessage({
        imported: importedSupplierIds.length,
        alreadyInStore,
        skippedLimit,
        failed,
        categoryLabel: category ? supplierCategoryLabel(category) : null,
      }),
    };

    if (result.imported === 0 && result.failed > 0) {
      return {
        error: lastError
          ? `No se pudieron cargar los productos (${lastError}). Intenta de nuevo.`
          : "No se pudieron cargar los productos. Intenta de nuevo.",
        ...result,
      };
    }

    return result;
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los productos mayoristas.",
    };
  }
}
