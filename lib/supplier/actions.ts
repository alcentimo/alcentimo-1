"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  resolveSupplierAccess,
  resolveSupplierAuthEmail,
} from "@/lib/supplier/access";
import { recordSupplierPriceChangeAndNotify } from "@/lib/dropship/price-change";
import { mirrorSupplierStockToLinkedStores } from "@/lib/dropship/supplier-stock";
import {
  normalizeSupplierProductCategory,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";
import {
  listSupplierProductImages,
  supplierImageUrls,
  syncSupplierProductGalleryFromFormData,
  type SupplierProductImage,
} from "@/lib/supplier/product-images";
import {
  normalizeSupplierProductVariants,
  parseSupplierVariantsFromForm,
  type SupplierProductVariants,
} from "@/lib/supplier/variants";
import {
  normalizePublicationStatus,
  type SupplierPublicationStatus,
} from "@/lib/supplier/wholesale-price";
import { MERCADO_CATALOG_CACHE_TAG } from "@/lib/mercado-oculto/catalog-cache";
import { revalidateAllPublicCatalogCaches } from "@/lib/catalog/public-catalog-cache";

function bustMercadoCatalogCache() {
  revalidateTag(MERCADO_CATALOG_CACHE_TAG, "max");
  revalidatePath("/mercado-oculto");
  revalidateAllPublicCatalogCaches();
}

export interface SupplierProduct {
  id: string;
  title: string;
  description: string;
  category: SupplierProductCategory;
  variants: SupplierProductVariants;
  stock: number;
  basePriceUsd: number;
  publicationStatus: SupplierPublicationStatus;
  imageUrl: string | null;
  gallery: SupplierProductImage[];
  createdAt: string;
  updatedAt: string;
}

/** Resultado de acciones del hub: error opcional + payload parcial tipado. */
type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

async function requireSupplierUser(): Promise<{
  error?: string;
  user?: { id: string };
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión." };
  }

  const email = resolveSupplierAuthEmail(user);
  const access = await resolveSupplierAccess({
    email,
    userId: user.id,
    user,
  });
  if (!access.ok) {
    return { error: "No tienes acceso al panel de proveedores." };
  }

  return { user: { id: user.id } };
}

const PRODUCT_SELECT =
  "id, title, description, category, variants, stock, base_price_usd, publication_status, image_url, created_at, updated_at";

function mapRow(
  row: Record<string, unknown>,
  gallery: SupplierProductImage[] = [],
): SupplierProduct {
  const coverFromRow =
    typeof row.image_url === "string" && row.image_url.trim()
      ? row.image_url.trim()
      : null;
  const urls = supplierImageUrls(gallery, coverFromRow);

  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    category: normalizeSupplierProductCategory(row.category),
    variants: normalizeSupplierProductVariants(row.variants),
    stock: Number(row.stock) || 0,
    basePriceUsd: Number(row.base_price_usd) || 0,
    publicationStatus: normalizePublicationStatus(row.publication_status),
    imageUrl: urls[0] ?? null,
    gallery,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

async function mapRowsWithGallery(
  admin: ReturnType<typeof createAdminClient>,
  rows: Record<string, unknown>[],
): Promise<SupplierProduct[]> {
  const products = rows.map((row) => mapRow(row));
  const galleryByProduct = await listSupplierProductImages(
    admin,
    products.map((product) => product.id),
  );
  return products.map((product) => {
    const gallery = galleryByProduct.get(product.id) ?? [];
    const urls = supplierImageUrls(gallery, product.imageUrl);
    return {
      ...product,
      gallery,
      imageUrl: urls[0] ?? null,
    };
  });
}

function parseProductFields(formData: FormData): {
  error?: string;
  title?: string;
  description?: string;
  category?: SupplierProductCategory;
  variants?: SupplierProductVariants;
  stock?: number;
  basePriceUsd?: number;
} {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = normalizeSupplierProductCategory(formData.get("category"));
  const variants = parseSupplierVariantsFromForm(formData.get("variants"));
  const stockRaw = String(formData.get("stock") ?? "0").trim();
  const priceRaw = String(formData.get("basePriceUsd") ?? "0").trim();

  if (title.length < 2) {
    return { error: "Indica un título de al menos 2 caracteres." };
  }

  const stock = Number(stockRaw);
  if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
    return { error: "El stock debe ser un número entero ≥ 0." };
  }

  const basePriceUsd = Number(priceRaw.replace(",", "."));
  if (!Number.isFinite(basePriceUsd) || basePriceUsd < 0) {
    return { error: "Indica un costo de proveedor válido en USD." };
  }

  for (const option of variants.options) {
    if (!option.label.trim()) {
      return { error: "Cada variante debe tener un nombre." };
    }
  }

  return {
    title,
    description,
    category,
    variants: normalizeSupplierProductVariants(variants),
    stock,
    basePriceUsd: Math.round(basePriceUsd * 100) / 100,
  };
}

export async function listSupplierProducts(): Promise<
  ActionResult<{ products: SupplierProduct[] }>
> {
  const auth = await requireSupplierUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Sin sesión." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("supplier_products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("created_by", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return {
    products: await mapRowsWithGallery(
      admin,
      (data as Record<string, unknown>[] | null) ?? [],
    ),
  };
}

export async function createSupplierProduct(
  formData: FormData,
): Promise<ActionResult<{ product: SupplierProduct }>> {
  const auth = await requireSupplierUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Sin sesión." };

  const parsed = parseProductFields(formData);
  if (parsed.error || !parsed.title || parsed.stock == null || parsed.basePriceUsd == null) {
    return { error: parsed.error ?? "Datos inválidos." };
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("supplier_products")
    .insert({
      created_by: auth.user.id,
      title: parsed.title.slice(0, 180),
      description: (parsed.description ?? "").slice(0, 4000),
      category: parsed.category ?? "otros",
      variants: parsed.variants ?? normalizeSupplierProductVariants(null),
      stock: parsed.stock,
      base_price_usd: parsed.basePriceUsd,
      precio_mayorista: null,
      publication_status: "draft",
      catalog_visible: false,
      is_visible: true,
      image_url: null,
      is_active: true,
    })
    .select(PRODUCT_SELECT)
    .single();

  if (error || !data) {
    return { error: error?.message ?? "No se pudo crear el producto." };
  }

  const createdRow = data as Record<string, unknown>;
  const gallery = await syncSupplierProductGalleryFromFormData(
    admin,
    auth.user.id,
    String(createdRow.id),
    formData,
  );
  if (gallery.error) {
    await admin
      .from("supplier_products")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdRow.id)
      .eq("created_by", auth.user.id);
    return { error: gallery.error };
  }

  const created = mapRow(createdRow, gallery.images);
  await admin.from("supplier_product_price_history").insert({
    supplier_product_id: created.id,
    old_price_usd: null,
    new_price_usd: created.basePriceUsd,
    changed_by: auth.user.id,
    note: "Costo inicial del proveedor al crear el producto.",
  });

  revalidatePath("/proveedor/dashboard");
  bustMercadoCatalogCache();
  return { product: created };
}

export async function updateSupplierProduct(
  productId: string,
  formData: FormData,
): Promise<ActionResult<{ product: SupplierProduct }>> {
  const auth = await requireSupplierUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Sin sesión." };

  const id = productId.trim();
  if (!id) return { error: "Producto inválido." };

  const parsed = parseProductFields(formData);
  if (parsed.error || !parsed.title || parsed.stock == null || parsed.basePriceUsd == null) {
    return { error: parsed.error ?? "Datos inválidos." };
  }

  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("supplier_products")
    .select("id, base_price_usd, title")
    .eq("id", id)
    .eq("created_by", auth.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (!existing) return { error: "Producto no encontrado." };

  const previousPrice = Number(existing.base_price_usd) || 0;
  const nextPrice = parsed.basePriceUsd;

  const patch: Record<string, unknown> = {
    title: parsed.title.slice(0, 180),
    description: (parsed.description ?? "").slice(0, 4000),
    category: parsed.category ?? "otros",
    variants: parsed.variants ?? normalizeSupplierProductVariants(null),
    stock: parsed.stock,
    base_price_usd: nextPrice,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("supplier_products")
    .update(patch)
    .eq("id", id)
    .eq("created_by", auth.user.id)
    .eq("is_active", true)
    .select(PRODUCT_SELECT)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Producto no encontrado." };

  const gallery = await syncSupplierProductGalleryFromFormData(
    admin,
    auth.user.id,
    id,
    formData,
  );
  if (gallery.error) {
    return { error: gallery.error };
  }

  const updated = mapRow(data as Record<string, unknown>, gallery.images);

  await recordSupplierPriceChangeAndNotify({
    admin,
    supplierProductId: updated.id,
    productTitle: updated.title,
    oldPriceUsd: previousPrice,
    newPriceUsd: updated.basePriceUsd,
    changedBy: auth.user.id,
    note: "Actualización de costo del proveedor (interno).",
    notifyMerchants: false,
  });

  await mirrorSupplierStockToLinkedStores(admin, updated.id, updated.stock);

  revalidatePath("/proveedor/dashboard");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  bustMercadoCatalogCache();
  return { product: updated };
}

export async function archiveSupplierProduct(
  productId: string,
): Promise<ActionResult> {
  const auth = await requireSupplierUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "Sin sesión." };

  const id = productId.trim();
  if (!id) return { error: "Producto inválido." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("supplier_products")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("created_by", auth.user.id)
    .eq("is_active", true);

  if (error) return { error: error.message };

  revalidatePath("/proveedor/dashboard");
  bustMercadoCatalogCache();
  return {};
}
