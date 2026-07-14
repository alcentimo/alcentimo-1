"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore, requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { getUserStore } from "@/lib/stores";
import { slugify, uniqueSlug } from "@/lib/slugify";
import { uploadProductImage, buildOptimizationMessage } from "@/lib/storage";
import { parseVariantFormInputs, parseVariantsJson } from "@/lib/products/variants";
import { syncProductVariants } from "@/lib/products/sync-variants";
import { assertCanCreateProduct } from "@/lib/plans/product-limit";
import {
  buildProductMetadata,
  parseExtraFieldsFromMetadata,
  parseExtraFieldsJson,
  pickExtraFieldValues,
} from "@/lib/products/extra-fields";
import { getStoreProductFieldConfig } from "@/lib/products/store-field-config";

export type ProductFormState = {
  error?: string;
  success?: boolean;
  catalogUrl?: string;
  imageOptimizedMessage?: string;
  productId?: string;
};

export interface ProductEditData {
  productId: string;
  name: string;
  shortDescription: string;
  description: string;
  priceUsd: number;
  stockQuantity: number;
  lowStockThreshold: number;
  categoryId: string;
  defaultVariantId: string;
  variants: import("@/lib/products/variants").ProductVariantJson[];
  thumbUrl: string | null;
  extraFields: Record<string, string>;
}

export type StoreFormState = {
  error?: string;
  success?: boolean;
};

async function getSupabase(): Promise<SupabaseClient> {
  return createClient();
}

async function ensureDefaultCategory(
  storeId: string,
): Promise<{ categoryId?: string; error?: string }> {
  const supabase = await getSupabase();

  const { data: existing, error: existingError } = await supabase
    .from("categories")
    .select("id")
    .eq("store_id", storeId)
    .eq("slug", "general")
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (existing) return { categoryId: existing.id as string };

  const { data: created, error } = await supabase
    .from("categories")
    .insert({
      store_id: storeId,
      name: "General",
      slug: "general",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { categoryId: created.id as string };
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const { store } = auth;

  // Ignorar store_id del cliente; usar siempre la tienda de la sesión
  const _clientStoreId = String(formData.get("store_id") ?? "");
  if (_clientStoreId && _clientStoreId !== store.id) {
    return { error: "No tienes permiso para publicar en esta tienda." };
  }

  const productLimitCheck = await assertCanCreateProduct(store.id);
  if (!productLimitCheck.ok) {
    return { error: productLimitCheck.error };
  }

  const name = String(formData.get("name") ?? "").trim();
  const shortDescription = String(
    formData.get("short_description") ?? "",
  ).trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceUsd = parseFloat(String(formData.get("price_usd") ?? ""));
  const stockQuantity = parseInt(String(formData.get("stock_quantity") ?? "0"), 10);
  const lowStockThreshold = parseInt(
    String(formData.get("low_stock_threshold") ?? "5"),
    10,
  );
  const imageFile = formData.get("image");
  let categoryId = String(formData.get("category_id") ?? "").trim();
  const variantsRaw = String(formData.get("variants_json") ?? "");
  const parsedVariants = parseVariantFormInputs(variantsRaw);
  if (parsedVariants.error) return { error: parsedVariants.error };
  const customVariants = parsedVariants.variants;
  const hasCustomVariants = customVariants.length > 0;

  if (!name) return { error: "El nombre es obligatorio." };
  if (!Number.isFinite(priceUsd) || priceUsd < 0) {
    return { error: "Ingresa un precio USD válido." };
  }
  if (!hasCustomVariants) {
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      return { error: "Ingresa un stock válido (0 o más)." };
    }
  }
  if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
    return { error: "Ingresa un umbral de alerta válido (0 o más)." };
  }

  const fieldConfig = await getStoreProductFieldConfig(store.id);
  const extraFieldsParsed = parseExtraFieldsJson(
    String(formData.get("extra_fields_json") ?? ""),
  );
  if (extraFieldsParsed.error) return { error: extraFieldsParsed.error };
  const metadata = buildProductMetadata(
    null,
    extraFieldsParsed.fields,
    fieldConfig.fieldLabels,
  );

  if (!categoryId) {
    const ensured = await ensureDefaultCategory(store.id);
    if (ensured.error || !ensured.categoryId) {
      return { error: ensured.error ?? "No se pudo crear la categoría." };
    }
    categoryId = ensured.categoryId;
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (categoryError) return { error: categoryError.message };
  if (!category) {
    return { error: "La categoría no pertenece a tu tienda." };
  }

  let productSlug = slugify(name) || "producto";
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? productSlug : uniqueSlug(name, crypto.randomUUID());
    const { data: taken } = await supabase
      .from("products")
      .select("id")
      .eq("store_id", store.id)
      .eq("slug", candidate)
      .maybeSingle();
    if (!taken) {
      productSlug = candidate;
      break;
    }
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      store_id: store.id,
      category_id: categoryId,
      name,
      slug: productSlug,
      short_description: shortDescription || null,
      description: description || null,
      metadata,
    })
    .select("id")
    .single();

  if (productError) return { error: productError.message };

  const productId = product.id as string;
  const sku = `${store.slug}-${productSlug}`.slice(0, 80);

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .insert({
      product_id: productId,
      sku,
      name: hasCustomVariants ? "Base" : "Estándar",
      stock_quantity: hasCustomVariants ? 0 : stockQuantity,
      low_stock_threshold: lowStockThreshold,
      is_default: true,
    })
    .select("id")
    .single();

  if (variantError) return { error: variantError.message };

  const variantId = variant.id as string;

  const { error: priceError } = await supabase.from("product_prices").insert({
    variant_id: variantId,
    amount_usd: priceUsd,
  });

  if (priceError) return { error: priceError.message };

  if (hasCustomVariants) {
    const synced = await syncProductVariants(supabase, {
      productId,
      storeSlug: store.slug,
      productSlug,
      basePriceUsd: priceUsd,
      lowStockThreshold,
      variants: customVariants,
      defaultVariantId: variantId,
    });
    if (synced.error) return { error: synced.error };
  }

  if (imageFile instanceof File && imageFile.size > 0) {
    const uploaded = await uploadProductImage(supabase, store.id, imageFile);

    if (uploaded.error || !uploaded.url) {
      return { error: uploaded.error ?? "No se pudo subir la imagen." };
    }

    const optimization = uploaded.optimization;

    const { error: imageError } = await supabase.from("product_images").insert({
      product_id: productId,
      thumb_url: uploaded.url,
      medium_url: uploaded.url,
      full_url: uploaded.url,
      is_primary: true,
      alt_text: name,
      mime_type: "image/webp",
      byte_size: optimization?.compressedSize ?? imageFile.size,
      width: optimization?.width ?? null,
      height: optimization?.height ?? null,
    });

    if (imageError) return { error: imageError.message };

    revalidatePath(`/tienda/${store.slug}`);
    revalidatePath("/dashboard/productos/nuevo");
    revalidatePath("/dashboard/inventario");

    return {
      success: true,
      catalogUrl: `/tienda/${store.slug}`,
      imageOptimizedMessage: optimization
        ? buildOptimizationMessage(optimization)
        : undefined,
    };
  }

  revalidatePath(`/tienda/${store.slug}`);
  revalidatePath("/dashboard/productos/nuevo");
  revalidatePath("/dashboard/inventario");

  return {
    success: true,
    catalogUrl: `/tienda/${store.slug}`,
  };
}

export async function getProductForEdit(productId: string): Promise<ProductEditData | null> {
  const supabase = await getSupabase();
  const store = await getUserStore(supabase);
  if (!store) return null;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select(
      "id, name, short_description, description, category_id, metadata, variants, product_images(thumb_url, is_primary)",
    )
    .eq("id", productId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (productError || !product) return null;

  const { data: defaultVariant, error: variantError } = await supabase
    .from("product_variants")
    .select("id, stock_quantity, low_stock_threshold")
    .eq("product_id", productId)
    .eq("is_default", true)
    .maybeSingle();

  if (variantError || !defaultVariant) return null;

  const { data: priceRow } = await supabase
    .from("product_prices")
    .select("amount_usd")
    .eq("variant_id", defaultVariant.id)
    .maybeSingle();

  const images = (product.product_images ?? []) as {
    thumb_url: string;
    is_primary: boolean;
  }[];
  const primaryImage = images.find((img) => img.is_primary) ?? images[0];
  const fieldConfig = await getStoreProductFieldConfig(store.id);
  const storedExtraFields = parseExtraFieldsFromMetadata(
    product.metadata as Record<string, unknown> | null,
  );

  return {
    productId: product.id as string,
    name: product.name as string,
    shortDescription: (product.short_description as string | null) ?? "",
    description: (product.description as string | null) ?? "",
    priceUsd: Number(priceRow?.amount_usd ?? 0),
    stockQuantity: Number(defaultVariant.stock_quantity ?? 0),
    lowStockThreshold: Number(defaultVariant.low_stock_threshold ?? 5),
    categoryId: product.category_id as string,
    defaultVariantId: defaultVariant.id as string,
    variants: parseVariantsJson(product.variants),
    thumbUrl: primaryImage?.thumb_url ?? null,
    extraFields: pickExtraFieldValues(storedExtraFields, fieldConfig.fieldLabels),
  };
}

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { store } = auth;

  const productId = String(formData.get("product_id") ?? "").trim();
  if (!productId) return { error: "Producto no válido." };

  const { data: existingProduct, error: lookupError } = await supabase
    .from("products")
    .select("id, slug, metadata")
    .eq("id", productId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (lookupError) return { error: lookupError.message };
  if (!existingProduct) return { error: "Producto no encontrado." };

  const name = String(formData.get("name") ?? "").trim();
  const shortDescription = String(formData.get("short_description") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceUsd = parseFloat(String(formData.get("price_usd") ?? ""));
  const stockQuantity = parseInt(String(formData.get("stock_quantity") ?? "0"), 10);
  const lowStockThreshold = parseInt(
    String(formData.get("low_stock_threshold") ?? "5"),
    10,
  );
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const defaultVariantId = String(formData.get("default_variant_id") ?? "").trim();
  const variantsRaw = String(formData.get("variants_json") ?? "");
  const imageFile = formData.get("image");
  const parsedVariants = parseVariantFormInputs(variantsRaw);
  if (parsedVariants.error) return { error: parsedVariants.error };
  const customVariants = parsedVariants.variants;
  const hasCustomVariants = customVariants.length > 0;

  if (!name) return { error: "El nombre es obligatorio." };
  if (!Number.isFinite(priceUsd) || priceUsd < 0) {
    return { error: "Ingresa un precio USD válido." };
  }
  if (!hasCustomVariants && (!Number.isFinite(stockQuantity) || stockQuantity < 0)) {
    return { error: "Ingresa un stock válido (0 o más)." };
  }
  if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
    return { error: "Ingresa un umbral de alerta válido (0 o más)." };
  }
  if (!categoryId) return { error: "Selecciona una categoría." };
  if (!defaultVariantId) return { error: "Variante base no encontrada." };

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (categoryError) return { error: categoryError.message };
  if (!category) return { error: "La categoría no pertenece a tu tienda." };

  const fieldConfig = await getStoreProductFieldConfig(store.id);
  const extraFieldsParsed = parseExtraFieldsJson(
    String(formData.get("extra_fields_json") ?? ""),
  );
  if (extraFieldsParsed.error) return { error: extraFieldsParsed.error };
  const metadata = buildProductMetadata(
    existingProduct.metadata as Record<string, unknown> | null,
    extraFieldsParsed.fields,
    fieldConfig.fieldLabels,
  );

  const { error: productUpdateError } = await supabase
    .from("products")
    .update({
      name,
      short_description: shortDescription || null,
      description: description || null,
      category_id: categoryId,
      metadata,
    })
    .eq("id", productId)
    .eq("store_id", store.id);

  if (productUpdateError) return { error: productUpdateError.message };

  const { error: defaultVariantError } = await supabase
    .from("product_variants")
    .update({
      name: hasCustomVariants ? "Base" : "Estándar",
      stock_quantity: hasCustomVariants ? 0 : stockQuantity,
      low_stock_threshold: lowStockThreshold,
      is_default: true,
    })
    .eq("id", defaultVariantId)
    .eq("product_id", productId);

  if (defaultVariantError) return { error: defaultVariantError.message };

  const priceUpdate = await supabase
    .from("product_prices")
    .update({ amount_usd: priceUsd })
    .eq("variant_id", defaultVariantId);

  if (priceUpdate.error) return { error: priceUpdate.error.message };

  if (hasCustomVariants) {
    const synced = await syncProductVariants(supabase, {
      productId,
      storeSlug: store.slug,
      productSlug: existingProduct.slug as string,
      basePriceUsd: priceUsd,
      lowStockThreshold,
      variants: customVariants,
      defaultVariantId,
    });
    if (synced.error) return { error: synced.error };
  } else {
    await supabase.from("products").update({ variants: [] }).eq("id", productId);
  }

  if (imageFile instanceof File && imageFile.size > 0) {
    const uploaded = await uploadProductImage(supabase, store.id, imageFile);
    if (uploaded.error || !uploaded.url) {
      return { error: uploaded.error ?? "No se pudo subir la imagen." };
    }

    await supabase.from("product_images").delete().eq("product_id", productId);

    const optimization = uploaded.optimization;
    const { error: imageError } = await supabase.from("product_images").insert({
      product_id: productId,
      thumb_url: uploaded.url,
      medium_url: uploaded.url,
      full_url: uploaded.url,
      is_primary: true,
      alt_text: name,
      mime_type: "image/webp",
      byte_size: optimization?.compressedSize ?? imageFile.size,
      width: optimization?.width ?? null,
      height: optimization?.height ?? null,
    });

    if (imageError) return { error: imageError.message };

    revalidateInventoryPaths(store.slug);
    return {
      success: true,
      catalogUrl: `/tienda/${store.slug}`,
      productId,
      imageOptimizedMessage: optimization
        ? buildOptimizationMessage(optimization)
        : undefined,
    };
  }

  revalidateInventoryPaths(store.slug);
  revalidatePath(`/dashboard/productos/${productId}/editar`);
  return { success: true, catalogUrl: `/tienda/${store.slug}`, productId };
}

export async function createStore(
  _prev: StoreFormState,
  formData: FormData,
): Promise<StoreFormState> {
  const supabase = await getSupabase();
  const auth = await requireAuthUser(supabase);
  if (!auth.ok) return { error: auth.error };

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || name);

  if (!name) return { error: "El nombre de la tienda es obligatorio." };
  if (!slug) return { error: "El slug no es válido." };

  const { error } = await supabase.from("stores").insert({
    owner_id: auth.authUser.id,
    name,
    slug,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ese slug ya está en uso. Elige otro." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/productos/nuevo");
  revalidatePath("/dashboard/inventario");

  return { success: true };
}

export async function getStoreCategories(storeId: string) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export type DeleteProductState = {
  error?: string;
  success?: boolean;
};

export async function deleteProduct(productId: string): Promise<DeleteProductState> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { store } = auth;

  const { data: product, error: lookupError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (lookupError) return { error: lookupError.message };
  if (!product) return { error: "Producto no encontrado." };

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("store_id", store.id);

  if (error) return { error: error.message };

  revalidateInventoryPaths(store.slug);
  return { success: true };
}

export async function fetchInventoryProducts(): Promise<{
  products: import("@/lib/database.types").CatalogListItem[];
  error?: string;
}> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) {
    return { products: [], error: auth.error };
  }

  const { getStoreInventory } = await import("@/lib/inventory");
  const { products } = await getStoreInventory(auth.store.slug);
  return { products };
}

export type InventoryActionState = {
  error?: string;
  success?: boolean;
  stock?: number;
};

async function assertStoreProductVariant(
  supabase: SupabaseClient,
  storeId: string,
  productId: string,
  variantId: string,
): Promise<{ error?: string } | { ok: true }> {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (productError) return { error: productError.message };
  if (!product) return { error: "Producto no encontrado." };

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("id", variantId)
    .eq("product_id", productId)
    .maybeSingle();

  if (variantError) return { error: variantError.message };
  if (!variant) return { error: "Variante no encontrada." };

  return { ok: true };
}

function revalidateInventoryPaths(storeSlug: string) {
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard");
  revalidatePath(`/tienda/${storeSlug}`);
  revalidatePath(`/c/${storeSlug}`);
  revalidatePath("/dashboard/productos/nuevo");
}

export async function updateProductStock(
  productId: string,
  variantId: string,
  stockQuantity: number,
): Promise<InventoryActionState> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { store } = auth;

  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
    return { error: "Stock inválido." };
  }

  const access = await assertStoreProductVariant(
    supabase,
    store.id,
    productId,
    variantId,
  );
  if ("error" in access) return { error: access.error };

  const { error } = await supabase
    .from("product_variants")
    .update({ stock_quantity: Math.floor(stockQuantity) })
    .eq("id", variantId)
    .eq("product_id", productId);

  if (error) return { error: error.message };

  revalidateInventoryPaths(store.slug);
  return { success: true, stock: Math.floor(stockQuantity) };
}

export async function adjustProductStock(
  productId: string,
  delta: number,
): Promise<InventoryActionState> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { store } = auth;

  if (!Number.isFinite(delta) || delta === 0) {
    return { error: "Ajuste de stock no válido." };
  }

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("id, stock_quantity")
    .eq("product_id", productId)
    .eq("is_default", true)
    .maybeSingle();

  if (variantError) return { error: variantError.message };
  if (!variant) return { error: "Variante del producto no encontrada." };

  const access = await assertStoreProductVariant(
    supabase,
    store.id,
    productId,
    variant.id as string,
  );
  if ("error" in access) return { error: access.error };

  const current = Number(variant.stock_quantity ?? 0);
  const nextStock = Math.max(0, Math.floor(current + delta));

  return updateProductStock(productId, variant.id as string, nextStock);
}

export async function updateProductPriceUsd(
  productId: string,
  variantId: string,
  priceUsd: number,
): Promise<InventoryActionState> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { store } = auth;

  if (!Number.isFinite(priceUsd) || priceUsd < 0) {
    return { error: "Precio inválido." };
  }

  const access = await assertStoreProductVariant(
    supabase,
    store.id,
    productId,
    variantId,
  );
  if ("error" in access) return { error: access.error };

  const { data: existingPrice, error: priceLookupError } = await supabase
    .from("product_prices")
    .select("id")
    .eq("variant_id", variantId)
    .maybeSingle();

  if (priceLookupError) return { error: priceLookupError.message };

  const { error } = existingPrice
    ? await supabase
        .from("product_prices")
        .update({ amount_usd: priceUsd })
        .eq("variant_id", variantId)
    : await supabase.from("product_prices").insert({
        variant_id: variantId,
        amount_usd: priceUsd,
      });

  if (error) return { error: error.message };

  revalidateInventoryPaths(store.slug);
  return { success: true };
}

export async function duplicateProduct(
  productId: string,
): Promise<InventoryActionState> {
  const supabase = await getSupabase();
  const auth = await requireAuthStore(supabase);
  if (!auth.ok) return { error: auth.error };

  const { store } = auth;

  const productLimitCheck = await assertCanCreateProduct(store.id);
  if (!productLimitCheck.ok) {
    return { error: productLimitCheck.error };
  }

  const { data: source, error: sourceError } = await supabase
    .from("products")
    .select(
      "id, name, slug, short_description, description, category_id, brand, is_featured",
    )
    .eq("id", productId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (sourceError) return { error: sourceError.message };
  if (!source) return { error: "Producto no encontrado." };

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .select("id, sku, name, stock_quantity, is_default")
    .eq("product_id", productId)
    .eq("is_default", true)
    .maybeSingle();

  if (variantError) return { error: variantError.message };
  if (!variant) return { error: "No se encontró la variante del producto." };

  const { data: priceRow } = await supabase
    .from("product_prices")
    .select("amount_usd, compare_at_usd")
    .eq("variant_id", variant.id)
    .maybeSingle();

  const { data: imageRow } = await supabase
    .from("product_images")
    .select(
      "thumb_url, medium_url, full_url, alt_text, mime_type, byte_size, width, height, blur_hash",
    )
    .eq("product_id", productId)
    .eq("is_primary", true)
    .maybeSingle();

  const copyName = `${source.name} (copia)`;
  let productSlug = slugify(copyName) || "producto-copia";
  for (let i = 0; i < 5; i++) {
    const candidate =
      i === 0 ? productSlug : uniqueSlug(copyName, crypto.randomUUID());
    const { data: taken } = await supabase
      .from("products")
      .select("id")
      .eq("store_id", store.id)
      .eq("slug", candidate)
      .maybeSingle();
    if (!taken) {
      productSlug = candidate;
      break;
    }
  }

  const { data: newProduct, error: insertError } = await supabase
    .from("products")
    .insert({
      store_id: store.id,
      category_id: source.category_id,
      name: copyName,
      slug: productSlug,
      short_description: source.short_description,
      description: source.description,
      brand: source.brand,
      is_featured: false,
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };

  const newProductId = newProduct.id as string;
  const sku = `${store.slug}-${productSlug}`.slice(0, 80);

  const { data: newVariant, error: newVariantError } = await supabase
    .from("product_variants")
    .insert({
      product_id: newProductId,
      sku,
      name: variant.name ?? "Estándar",
      stock_quantity: variant.stock_quantity ?? 0,
      is_default: true,
    })
    .select("id")
    .single();

  if (newVariantError) return { error: newVariantError.message };

  if (priceRow?.amount_usd != null) {
    const { error: priceError } = await supabase.from("product_prices").insert({
      variant_id: newVariant.id,
      amount_usd: priceRow.amount_usd,
      compare_at_usd: priceRow.compare_at_usd,
    });
    if (priceError) return { error: priceError.message };
  }

  if (imageRow?.thumb_url) {
    await supabase.from("product_images").insert({
      product_id: newProductId,
      thumb_url: imageRow.thumb_url,
      medium_url: imageRow.medium_url,
      full_url: imageRow.full_url,
      is_primary: true,
      alt_text: copyName,
      mime_type: imageRow.mime_type,
      byte_size: imageRow.byte_size,
      width: imageRow.width,
      height: imageRow.height,
      blur_hash: imageRow.blur_hash,
    });
  }

  revalidateInventoryPaths(store.slug);
  return { success: true };
}
