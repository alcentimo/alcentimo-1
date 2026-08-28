import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Store } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePublicCatalogCache } from "@/lib/catalog/public-catalog-cache";
import { supplierPublicCatalogPath } from "@/lib/catalog/supplier-public-catalog";
import { normalizeProductBrand } from "@/lib/catalog/product-brand";
import { buildProductMetadata } from "@/lib/products/extra-fields";
import {
  buildImportCategoryCache,
  resolveOrCreateSupplierStoreCategory,
} from "@/lib/products/import-category";
import { allocateUniqueProductSlug } from "@/lib/products/allocate-product-slug";
import { syncProductVariants } from "@/lib/products/sync-variants";
import { getDefaultLocationId } from "@/lib/locations/sync-stock";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/inventory/stock-status";
import {
  mapSupplierProductImages,
  supplierImageUrls,
} from "@/lib/supplier/product-gallery";
import { normalizeSupplierProductCategory } from "@/lib/supplier/categories";
import {
  normalizeSupplierProductVariants,
  supplierVariantsToCatalogJson,
} from "@/lib/supplier/variants";
import {
  resolveCostoProveedorUsd,
  resolvePrecioMayoristaUsd,
  resolveSuggestedRetailUsd,
} from "@/lib/supplier/wholesale-price";
import type { ProductVariantJson } from "@/lib/products/variants";
import { revalidatePath } from "next/cache";
import {
  SUPPLIER_OWN_PRODUCT_METADATA_KEY,
} from "@/lib/supplier/own-store-ids";

export {
  SUPPLIER_OWN_PRODUCT_METADATA_KEY,
  listOwnBrandCatalogProductIds,
  listOwnBrandStoreCategories,
} from "@/lib/supplier/own-store-ids";

export function resolveOwnStoreRetailUsd(row: Record<string, unknown>): number {
  return (
    resolveSuggestedRetailUsd(row) ??
    resolvePrecioMayoristaUsd(row) ??
    resolveCostoProveedorUsd(row)
  );
}

function catalogVariantsFromSupplier(
  row: Record<string, unknown>,
  retailUsd: number,
): ProductVariantJson[] {
  return supplierVariantsToCatalogJson(
    normalizeSupplierProductVariants(row.variants),
    retailUsd,
  ).map((variant) => ({
    ...variant,
    id: crypto.randomUUID(),
  }));
}

async function listOwnStoreProductImages(
  client: SupabaseClient,
  productIds: string[],
) {
  const result = new Map<string, ReturnType<typeof mapSupplierProductImages>>();
  const uniqueIds = [...new Set(productIds.filter(Boolean))];
  if (uniqueIds.length === 0) return result;

  const { data, error } = await client
    .from("supplier_product_images")
    .select("id, supplier_product_id, image_url, sort_order, is_primary")
    .in("supplier_product_id", uniqueIds)
    .order("sort_order", { ascending: true });

  if (error) {
    console.warn("[own-store-sync] images", error.message);
    return result;
  }

  const grouped = new Map<string, Record<string, unknown>[]>();
  for (const row of (data as Record<string, unknown>[] | null) ?? []) {
    const productId = String(row.supplier_product_id ?? "");
    if (!productId) continue;
    const list = grouped.get(productId) ?? [];
    list.push(row);
    grouped.set(productId, list);
  }
  for (const [productId, rows] of grouped) {
    result.set(productId, mapSupplierProductImages(rows));
  }
  return result;
}

export async function syncSupplierOwnStoreCatalog(input: {
  admin?: ReturnType<typeof createAdminClient>;
  store: Pick<Store, "id" | "slug">;
  supplierUserId: string;
  supplierProductId?: string;
}): Promise<void> {
  const admin = input.admin ?? createAdminClient();
  const { store, supplierUserId } = input;

  let query = admin
    .from("supplier_products")
    .select(
      "id, title, description, category, variants, stock, base_price_usd, precio_mayorista, suggested_retail_usd, image_url, is_active, created_by",
    )
    .eq("created_by", supplierUserId);

  if (input.supplierProductId) {
    query = query.eq("id", input.supplierProductId);
  }

  const { data: supplierRows, error } = await query;
  if (error) {
    console.warn("[own-store-sync] list", error.message);
    return;
  }

  const rows = (supplierRows as Record<string, unknown>[] | null) ?? [];
  const { data: storeProducts } = await admin
    .from("products")
    .select("id, metadata")
    .eq("store_id", store.id);

  const bySupplierId = new Map<string, string>();
  for (const product of (storeProducts as Array<{
    id: string;
    metadata: unknown;
  }> | null) ?? []) {
    const metadata =
      product.metadata &&
      typeof product.metadata === "object" &&
      !Array.isArray(product.metadata)
        ? (product.metadata as Record<string, unknown>)
        : {};
    const supplierId = metadata[SUPPLIER_OWN_PRODUCT_METADATA_KEY];
    if (typeof supplierId === "string" && supplierId.trim()) {
      bySupplierId.set(supplierId, product.id);
    }
  }

  const { data: categoryRows } = await admin
    .from("categories")
    .select("id, name, slug")
    .eq("store_id", store.id);
  const categoryCache = buildImportCategoryCache(
    (categoryRows as { id: string; name: string; slug: string }[] | null) ?? [],
  );
  const defaultLocationId = await getDefaultLocationId(admin, store.id);
  const galleryByProduct = await listOwnStoreProductImages(
    admin,
    rows.map((row) => String(row.id)),
  );

  for (const row of rows) {
    const supplierProductId = String(row.id);
    const active = row.is_active !== false;
    const existingId = bySupplierId.get(supplierProductId);

    if (!active) {
      if (existingId) {
        await admin
          .from("products")
          .update({
            is_active: false,
            is_deleted: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingId)
          .eq("store_id", store.id);
      }
      continue;
    }

    await upsertOwnStoreProduct(admin, {
      store,
      row,
      existingId,
      categoryCache,
      defaultLocationId,
      imageUrls: supplierImageUrls(
        galleryByProduct.get(supplierProductId) ?? [],
        typeof row.image_url === "string" ? row.image_url : null,
      ),
    });
  }

  revalidatePath("/proveedor/dashboard/catalogo");
  revalidatePath(`/c/${store.slug}`);
  revalidatePath(supplierPublicCatalogPath(store.slug));
  revalidatePublicCatalogCache({ slug: store.slug, storeId: store.id });
}

async function upsertOwnStoreProduct(
  admin: SupabaseClient,
  input: {
    store: Pick<Store, "id" | "slug">;
    row: Record<string, unknown>;
    existingId?: string;
    categoryCache: ReturnType<typeof buildImportCategoryCache>;
    defaultLocationId: string | null;
    imageUrls: string[];
  },
) {
  const retailUsd = resolveOwnStoreRetailUsd(input.row);
  const title = String(input.row.title ?? "Producto").slice(0, 120);
  const description = String(input.row.description ?? "");
  const stock = Math.max(0, Math.floor(Number(input.row.stock) || 0));
  const category = normalizeSupplierProductCategory(input.row.category);
  const categoryResolved = await resolveOrCreateSupplierStoreCategory(
    admin,
    input.store.id,
    category,
    input.categoryCache,
  );
  if (categoryResolved.error || !categoryResolved.categoryId) return;

  const ownBrand = normalizeProductBrand(
    typeof input.row.brand === "string" ? input.row.brand : null,
  );
  const metadata = buildProductMetadata(
    { [SUPPLIER_OWN_PRODUCT_METADATA_KEY]: String(input.row.id) },
    ownBrand ? { Marca: ownBrand } : {},
    ["Marca"],
  );
  const now = new Date().toISOString();
  let productId = input.existingId;

  if (!productId) {
    productId = crypto.randomUUID();
    const slug = await allocateUniqueProductSlug(admin, input.store.id, title);
    const { error } = await admin.from("products").insert({
      id: productId,
      store_id: input.store.id,
      category_id: categoryResolved.categoryId,
      name: title,
      slug,
      short_description: description,
      description,
      brand: ownBrand,
      metadata,
      is_active: true,
      is_deleted: false,
    });
    if (error) {
      console.warn("[own-store-sync] insert product", error.message);
      return;
    }

    const variantId = crypto.randomUUID();
    const { error: variantError } = await admin.from("product_variants").insert({
      id: variantId,
      product_id: productId,
      sku: `${input.store.slug}-${slug}`.slice(0, 80),
      name: "Estándar",
      stock_quantity: stock,
      low_stock_threshold: DEFAULT_LOW_STOCK_THRESHOLD,
      is_default: true,
      is_active: true,
    });
    if (variantError) {
      console.warn("[own-store-sync] variant", variantError.message);
      return;
    }

    await admin.from("product_prices").insert({
      variant_id: variantId,
      amount_usd: retailUsd,
    });

    if (input.defaultLocationId) {
      await admin.from("variant_location_stock").upsert(
        {
          variant_id: variantId,
          location_id: input.defaultLocationId,
          stock_quantity: stock,
          reserved_quantity: 0,
        },
        { onConflict: "variant_id,location_id" },
      );
    }

    await replaceImages(admin, productId, title, input.imageUrls);
    const catalogVariants = catalogVariantsFromSupplier(input.row, retailUsd);
    if (catalogVariants.length > 0) {
      await syncProductVariants(admin, {
        productId,
        storeSlug: input.store.slug,
        productSlug: slug,
        basePriceUsd: retailUsd,
        lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
        variants: catalogVariants,
        defaultVariantId: variantId,
        storeId: input.store.id,
      });
    }
    return;
  }

  await admin
    .from("products")
    .update({
      category_id: categoryResolved.categoryId,
      name: title,
      short_description: description,
      description,
      brand: ownBrand,
      metadata,
      is_active: true,
      is_deleted: false,
      updated_at: now,
    })
    .eq("id", productId)
    .eq("store_id", input.store.id);

  const { data: defaultVariant } = await admin
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("is_default", true)
    .maybeSingle();

  if (defaultVariant?.id) {
    await admin
      .from("product_variants")
      .update({ stock_quantity: stock, is_active: true })
      .eq("id", defaultVariant.id);
    await admin
      .from("product_prices")
      .upsert(
        { variant_id: defaultVariant.id, amount_usd: retailUsd },
        { onConflict: "variant_id" },
      );
    if (input.defaultLocationId) {
      await admin.from("variant_location_stock").upsert(
        {
          variant_id: defaultVariant.id,
          location_id: input.defaultLocationId,
          stock_quantity: stock,
        },
        { onConflict: "variant_id,location_id" },
      );
    }
  }

  await replaceImages(admin, productId, title, input.imageUrls);
}

async function replaceImages(
  admin: SupabaseClient,
  productId: string,
  name: string,
  imageUrls: string[],
) {
  await admin.from("product_images").delete().eq("product_id", productId);
  const urls = [...new Set(imageUrls.map((url) => url.trim()).filter(Boolean))];
  if (urls.length === 0) return;
  await admin.from("product_images").insert(
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
}
