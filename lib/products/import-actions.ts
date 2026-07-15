"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAuthStore } from "@/lib/auth/require-dashboard-auth";
import { slugify, uniqueSlug } from "@/lib/slugify";
import { assertCanCreateProduct } from "@/lib/plans/product-limit";
import { buildProductMetadata } from "@/lib/products/extra-fields";
import {
  buildImportCategoryCache,
  findDuplicateImportNames,
  resolveOrCreateImportCategory,
} from "@/lib/products/import-category";
import {
  normalizeImportCategoryName,
  normalizeProductNameKey,
  sanitizeImportImageUrl,
  sanitizeImportText,
  parseImportPrice,
  parseImportStock,
} from "@/lib/products/import-sanitize";
import {
  PRODUCT_IMPORT_LIMITS,
  PRODUCT_IMPORT_MAX_ROWS,
  type ProductImportResult,
  type ValidatedImportRow,
} from "@/lib/products/import-schema";
import { validateProductImportSheet } from "@/lib/products/import-validation";

const DEFAULT_LOW_STOCK_THRESHOLD = 5;

function revalidateAfterImport(storeSlug: string) {
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard");
  revalidatePath(`/tienda/${storeSlug}`);
  revalidatePath(`/c/${storeSlug}`);
  revalidatePath("/dashboard/productos/nuevo");
}

function revalidateImportRow(row: ValidatedImportRow): ValidatedImportRow | null {
  const nombre = sanitizeImportText(row.nombre, PRODUCT_IMPORT_LIMITS.nombre);
  const descripcionRaw = row.descripcion
    ? sanitizeImportText(row.descripcion, PRODUCT_IMPORT_LIMITS.descripcion)
    : "";
  const categoria = row.categoria
    ? normalizeImportCategoryName(
        sanitizeImportText(row.categoria, PRODUCT_IMPORT_LIMITS.categoria),
      )
    : "";
  const precio = parseImportPrice(row.precio);
  const stock = parseImportStock(row.stock);
  const urlProvided = row.url_imagen
    ? sanitizeImportText(row.url_imagen, PRODUCT_IMPORT_LIMITS.url_imagen)
    : "";
  const url_imagen = urlProvided
    ? sanitizeImportImageUrl(row.url_imagen)
    : null;

  if (
    !nombre ||
    !categoria ||
    precio === null ||
    stock === null ||
    (urlProvided && !url_imagen)
  ) {
    return null;
  }

  return {
    rowNumber: row.rowNumber,
    nombre,
    descripcion: descripcionRaw || null,
    precio,
    stock,
    url_imagen,
    categoria,
  };
}

async function upsertProductImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  name: string,
  imageUrl: string,
) {
  await supabase.from("product_images").delete().eq("product_id", productId);

  const { error } = await supabase.from("product_images").insert({
    product_id: productId,
    thumb_url: imageUrl,
    medium_url: imageUrl,
    full_url: imageUrl,
    is_primary: true,
    alt_text: name,
    mime_type: null,
    byte_size: null,
    width: null,
    height: null,
  });

  return error?.message;
}

export async function importProductsBulk(
  rows: ValidatedImportRow[],
): Promise<ProductImportResult> {
  const supabase = await createClient();
  const auth = await requireAuthStore(supabase);

  if (!auth.ok) {
    return { ok: false, created: 0, updated: 0, errors: [auth.error] };
  }

  const { store } = auth;

  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      errors: ["No hay productos para importar."],
    };
  }

  if (rows.length > PRODUCT_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      errors: [
        `Máximo ${PRODUCT_IMPORT_MAX_ROWS} productos por importación.`,
      ],
    };
  }

  const sanitizedRows = rows
    .map((row) => revalidateImportRow(row))
    .filter((row): row is ValidatedImportRow => row !== null);

  if (sanitizedRows.length !== rows.length) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      errors: ["Los datos enviados no pasaron la validación del servidor."],
    };
  }

  const duplicateErrors = findDuplicateImportNames(sanitizedRows);
  if (duplicateErrors.length > 0) {
    return { ok: false, created: 0, updated: 0, errors: duplicateErrors };
  }

  const { data: storeCategories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("store_id", store.id);

  if (categoriesError) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      errors: [categoriesError.message],
    };
  }

  const categoryCache = buildImportCategoryCache(
    (storeCategories ?? []) as { id: string; name: string; slug: string }[],
  );

  const { data: existingProducts, error: existingError } = await supabase
    .from("products")
    .select("id, name, slug")
    .eq("store_id", store.id);

  if (existingError) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      errors: [existingError.message],
    };
  }

  const existingByName = new Map<string, { id: string; slug: string }>();
  for (const product of existingProducts ?? []) {
    existingByName.set(normalizeProductNameKey(product.name as string), {
      id: product.id as string,
      slug: product.slug as string,
    });
  }

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of sanitizedRows) {
    const categoryResolved = await resolveOrCreateImportCategory(
      supabase,
      store.id,
      row.categoria,
      categoryCache,
    );
    if (categoryResolved.error || !categoryResolved.categoryId) {
      errors.push(
        `Fila ${row.rowNumber}: ${categoryResolved.error ?? "No se pudo asignar la categoría."}`,
      );
      continue;
    }

    const existing = existingByName.get(normalizeProductNameKey(row.nombre));

    if (existing) {
      const updateResult = await updateImportedProduct(supabase, {
        storeId: store.id,
        productId: existing.id,
        categoryId: categoryResolved.categoryId,
        row,
      });

      if (updateResult.error) {
        errors.push(`Fila ${row.rowNumber}: ${updateResult.error}`);
        continue;
      }

      updated += 1;
      continue;
    }

    const productLimitCheck = await assertCanCreateProduct(store.id);
    if (!productLimitCheck.ok) {
      errors.push(`Fila ${row.rowNumber}: ${productLimitCheck.error}`);
      continue;
    }

    const createResult = await createImportedProduct(supabase, {
      storeId: store.id,
      storeSlug: store.slug,
      categoryId: categoryResolved.categoryId,
      row,
    });

    if (createResult.error) {
      errors.push(`Fila ${row.rowNumber}: ${createResult.error}`);
      continue;
    }

    if (createResult.productId) {
      existingByName.set(normalizeProductNameKey(row.nombre), {
        id: createResult.productId,
        slug: createResult.slug ?? (slugify(row.nombre) || "producto"),
      });
    }

    created += 1;
  }

  if (created > 0 || updated > 0) {
    revalidateAfterImport(store.slug);
  }

  return {
    ok: errors.length === 0,
    created,
    updated,
    errors,
  };
}

async function createImportedProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    storeId: string;
    storeSlug: string;
    categoryId: string;
    row: ValidatedImportRow;
  },
): Promise<{ productId?: string; slug?: string; error?: string }> {
  const { storeId, storeSlug, categoryId, row } = params;

  let productSlug = slugify(row.nombre) || "producto";
  for (let i = 0; i < 5; i++) {
    const candidate =
      i === 0 ? productSlug : uniqueSlug(row.nombre, crypto.randomUUID());
    const { data: taken } = await supabase
      .from("products")
      .select("id")
      .eq("store_id", storeId)
      .eq("slug", candidate)
      .maybeSingle();
    if (!taken) {
      productSlug = candidate;
      break;
    }
  }

  const metadata = buildProductMetadata(null, {}, []);

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      store_id: storeId,
      category_id: categoryId,
      name: row.nombre,
      slug: productSlug,
      short_description: row.descripcion,
      description: row.descripcion,
      metadata,
    })
    .select("id")
    .single();

  if (productError) return { error: productError.message };

  const productId = product.id as string;
  const sku = `${storeSlug}-${productSlug}`.slice(0, 80);

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .insert({
      product_id: productId,
      sku,
      name: "Estándar",
      stock_quantity: row.stock,
      low_stock_threshold: DEFAULT_LOW_STOCK_THRESHOLD,
      is_default: true,
    })
    .select("id")
    .single();

  if (variantError) return { error: variantError.message };

  const variantId = variant.id as string;

  const { error: priceError } = await supabase.from("product_prices").insert({
    variant_id: variantId,
    amount_usd: row.precio,
  });

  if (priceError) return { error: priceError.message };

  if (row.url_imagen) {
    const imageError = await upsertProductImage(
      supabase,
      productId,
      row.nombre,
      row.url_imagen,
    );
    if (imageError) return { error: imageError };
  }

  return { productId, slug: productSlug };
}

async function updateImportedProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    storeId: string;
    productId: string;
    categoryId: string;
    row: ValidatedImportRow;
  },
): Promise<{ error?: string }> {
  const { storeId, productId, categoryId, row } = params;

  const { data: existingProduct, error: productLookupError } = await supabase
    .from("products")
    .select("id, metadata")
    .eq("id", productId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (productLookupError) return { error: productLookupError.message };
  if (!existingProduct) return { error: "Producto no encontrado." };

  const metadata = buildProductMetadata(
    existingProduct.metadata as Record<string, unknown> | null,
    {},
    [],
  );

  const { error: productUpdateError } = await supabase
    .from("products")
    .update({
      name: row.nombre,
      short_description: row.descripcion,
      description: row.descripcion,
      category_id: categoryId,
      metadata,
    })
    .eq("id", productId)
    .eq("store_id", storeId);

  if (productUpdateError) return { error: productUpdateError.message };

  const { data: defaultVariant, error: variantLookupError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("is_default", true)
    .maybeSingle();

  if (variantLookupError) return { error: variantLookupError.message };
  if (!defaultVariant?.id) {
    return { error: "Variante estándar no encontrada." };
  }

  const variantId = defaultVariant.id as string;

  const { error: variantUpdateError } = await supabase
    .from("product_variants")
    .update({
      stock_quantity: row.stock,
    })
    .eq("id", variantId)
    .eq("product_id", productId);

  if (variantUpdateError) return { error: variantUpdateError.message };

  const { error: priceUpdateError } = await supabase
    .from("product_prices")
    .update({ amount_usd: row.precio })
    .eq("variant_id", variantId);

  if (priceUpdateError) return { error: priceUpdateError.message };

  if (row.url_imagen) {
    const imageError = await upsertProductImage(
      supabase,
      productId,
      row.nombre,
      row.url_imagen,
    );
    if (imageError) return { error: imageError };
  }

  return {};
}

/** Re-valida filas crudas en el servidor (defensa en profundidad). */
export async function validateAndImportProducts(
  rawRows: unknown[][],
): Promise<ProductImportResult & { validationErrors?: string[] }> {
  const validation = validateProductImportSheet(rawRows);
  if (!validation.ok) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      errors: validation.errors,
      validationErrors: validation.errors,
    };
  }

  const duplicateErrors = findDuplicateImportNames(validation.rows);
  if (duplicateErrors.length > 0) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      errors: duplicateErrors,
      validationErrors: duplicateErrors,
    };
  }

  return importProductsBulk(validation.rows);
}
