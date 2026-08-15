"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import {
  applyRetailPriceToProduct,
} from "@/lib/dropship/price-change";
import {
  defaultDropshipPricingSettings,
  normalizeDropshipPricingSettings,
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
  resolveOrCreateImportCategory,
} from "@/lib/products/import-category";
import type { ProductVariantJson } from "@/lib/products/variants";
import { syncProductVariants } from "@/lib/products/sync-variants";
import {
  normalizeSupplierProductCategory,
  supplierCategoryLabel,
} from "@/lib/supplier/categories";
import {
  normalizeSupplierProductVariants,
  supplierVariantAttributeLabel,
  type SupplierProductVariants,
} from "@/lib/supplier/variants";
import { normalizeStoreRubro } from "@/src/config/categories";
import { syncDefaultLocationStockFromVariant } from "@/lib/locations/sync-stock";
import { mirrorSupplierStockToLinkedStores } from "@/lib/dropship/supplier-stock";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  supplierVariants: SupplierProductVariants,
): ProductVariantJson[] {
  if (supplierVariants.options.length === 0) return [];

  const attributeKey =
    supplierVariantAttributeLabel(supplierVariants)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .slice(0, 40) || "variante";

  // El stock vive en el mayorista; las opciones solo describen atributos.
  return supplierVariants.options.map((option) => ({
    id: crypto.randomUUID(),
    name: option.label,
    price_extra_usd: Number(option.priceExtraUsd) || 0,
    stock: 0,
    attributes: { [attributeKey]: option.label },
  }));
}

async function upsertCatalogProductImage(
  client: SupabaseClient,
  productId: string,
  name: string,
  imageUrl: string,
): Promise<string | undefined> {
  await client.from("product_images").delete().eq("product_id", productId);

  const { error } = await client.from("product_images").insert({
    product_id: productId,
    thumb_url: imageUrl,
    medium_url: imageUrl,
    full_url: imageUrl,
    is_primary: true,
    alt_text: name,
    // mime_type es NOT NULL con default image/webp; no enviar null.
    mime_type: "image/webp",
    sort_order: 0,
  });

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
      "id, product_id, supplier_product_id, auto_reprice, last_cost_usd, products(name), supplier_products(title, base_price_usd)",
    )
    .eq("store_id", auth.store.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const links: DropshipLinkRow[] = ((data as Record<string, unknown>[] | null) ?? []).map(
    (row) => {
      const product = row.products as { name?: string } | null;
      const supplier = row.supplier_products as {
        title?: string;
        base_price_usd?: number;
      } | null;
      const cost = Number(supplier?.base_price_usd) || 0;
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
  basePriceUsd: number;
  suggestedRetailUsd: number | null;
  stock: number;
  category: string;
  imageUrl: string | null;
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

  const [{ data, error }, { data: links }] = await Promise.all([
    admin
      .from("supplier_products")
      .select(
        "id, title, description, base_price_usd, stock, category, image_url, variants",
      )
      .eq("is_active", true)
      .order("title", { ascending: true })
      .limit(200),
    admin
      .from("store_dropship_links")
      .select("supplier_product_id, product_id")
      .eq("store_id", auth.store.id),
  ]);

  if (error) return { error: error.message };

  const linkedBySupplier = new Map<string, string>();
  for (const row of (links as Record<string, unknown>[] | null) ?? []) {
    const supplierId = String(row.supplier_product_id ?? "");
    const productId = String(row.product_id ?? "");
    if (supplierId && productId) {
      linkedBySupplier.set(supplierId, productId);
    }
  }

  return {
    products: ((data as Record<string, unknown>[] | null) ?? []).map((row) => {
      const id = String(row.id);
      const cost = Number(row.base_price_usd) || 0;
      const variants = normalizeSupplierProductVariants(row.variants);
      const linkedProductId = linkedBySupplier.get(id) ?? null;
      const imageUrl =
        typeof row.image_url === "string" && row.image_url.trim()
          ? row.image_url.trim()
          : null;

      return {
        id,
        title: String(row.title ?? ""),
        description: String(row.description ?? ""),
        basePriceUsd: cost,
        suggestedRetailUsd: suggestRetailFromWholesaleCost(
          cost,
          pricingForSuggest,
        ),
        stock: Number(row.stock) || 0,
        category: normalizeSupplierProductCategory(row.category),
        imageUrl,
        variantCount: variants.options.length,
        alreadyImported: linkedProductId != null,
        linkedProductId,
      };
    }),
  };
}

/**
 * Crea un producto en el catálogo de la tienda a partir de un SKU mayorista,
 * aplicando la regla de margen y vinculándolo para dropshipping.
 */
export async function importSupplierProductToStoreCatalog(
  supplierProductId: string,
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

    const { data: supplierRow, error: supplierError } = await admin
      .from("supplier_products")
      .select(
        "id, title, description, base_price_usd, stock, category, image_url, variants, is_active",
      )
      .eq("id", supplierId)
      .maybeSingle();

    if (supplierError) return { error: supplierError.message };
    if (!supplierRow || supplierRow.is_active === false) {
      return { error: "Producto mayorista no disponible." };
    }

    const title = String(supplierRow.title ?? "").trim();
    if (!title) return { error: "El producto mayorista no tiene nombre." };

    const cost = Number(supplierRow.base_price_usd) || 0;
    const retailUsd = suggestRetailFromWholesaleCost(cost, dropship);
    if (retailUsd == null || retailUsd < 0) {
      return {
        error: "No se pudo calcular el precio de venta con tu regla de margen.",
      };
    }

    const productLimitCheck = await assertCanCreateProduct(auth.store.id);
    if (!productLimitCheck.ok) {
      return { error: productLimitCheck.error };
    }

    const categoryLabel = supplierCategoryLabel(
      normalizeSupplierProductCategory(supplierRow.category),
    );
    const { data: storeCategories, error: categoriesError } = await admin
      .from("categories")
      .select("id, name, slug")
      .eq("store_id", auth.store.id);

    if (categoriesError) return { error: categoriesError.message };

    const categoryCache = buildImportCategoryCache(
      (storeCategories ?? []) as { id: string; name: string; slug: string }[],
    );
    const categoryResolved = await resolveOrCreateImportCategory(
      admin,
      auth.store.id,
      categoryLabel,
      categoryCache,
      normalizeStoreRubro(auth.store.rubro_tienda),
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
    const imageUrl =
      typeof supplierRow.image_url === "string" && supplierRow.image_url.trim()
        ? supplierRow.image_url.trim()
        : null;
    const supplierVariants = normalizeSupplierProductVariants(
      supplierRow.variants,
    );
    const catalogVariants = mapSupplierVariantsToCatalog(supplierVariants);
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

    if (imageUrl) {
      const imageError = await upsertCatalogProductImage(
        admin,
        productId,
        title,
        imageUrl,
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

    revalidatePath("/dashboard/ajustes");
    revalidatePath("/dashboard/catalogo");
    revalidatePath("/dashboard/inventario");
    revalidatePath("/dashboard");
    revalidatePath(`/c/${auth.store.slug}`);

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

  const { data: supplier } = await admin
    .from("supplier_products")
    .select("id, base_price_usd, stock")
    .eq("id", supplierProductId)
    .eq("is_active", true)
    .maybeSingle();
  if (!supplier) return { error: "Producto mayorista no disponible." };

  const cost = Number(supplier.base_price_usd) || 0;
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
  return {};
}
