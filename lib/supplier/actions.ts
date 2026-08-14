"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkSupplierAccess,
  resolveSupplierAuthEmail,
} from "@/lib/supplier/access";
import { uploadSupplierProductImage } from "@/lib/supplier/storage";
import { recordSupplierPriceChangeAndNotify } from "@/lib/dropship/price-change";
import { mirrorSupplierStockToLinkedStores } from "@/lib/dropship/supplier-stock";
import {
  normalizeSupplierProductCategory,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";
import {
  normalizeSupplierProductVariants,
  parseSupplierVariantsFromForm,
  type SupplierProductVariants,
} from "@/lib/supplier/variants";

export interface SupplierProduct {
  id: string;
  title: string;
  description: string;
  category: SupplierProductCategory;
  variants: SupplierProductVariants;
  stock: number;
  basePriceUsd: number;
  compareAtUsd: number | null;
  freeShipping: boolean;
  imageUrl: string | null;
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
  const access = checkSupplierAccess(email);
  if (!access.ok) {
    return { error: "No tienes acceso al panel de proveedores." };
  }

  return { user: { id: user.id } };
}

const PRODUCT_SELECT =
  "id, title, description, category, variants, stock, base_price_usd, compare_at_usd, free_shipping, image_url, created_at, updated_at";

function mapRow(row: Record<string, unknown>): SupplierProduct {
  const compareRaw = row.compare_at_usd;
  const compareAtUsd =
    compareRaw == null || compareRaw === ""
      ? null
      : Number.isFinite(Number(compareRaw))
        ? Number(compareRaw)
        : null;

  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    category: normalizeSupplierProductCategory(row.category),
    variants: normalizeSupplierProductVariants(row.variants),
    stock: Number(row.stock) || 0,
    basePriceUsd: Number(row.base_price_usd) || 0,
    compareAtUsd,
    freeShipping: Boolean(row.free_shipping),
    imageUrl:
      typeof row.image_url === "string" && row.image_url.trim()
        ? row.image_url
        : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function parseProductFields(formData: FormData): {
  error?: string;
  title?: string;
  description?: string;
  category?: SupplierProductCategory;
  variants?: SupplierProductVariants;
  stock?: number;
  basePriceUsd?: number;
  compareAtUsd?: number | null;
  freeShipping?: boolean;
  image?: FormDataEntryValue | null;
} {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = normalizeSupplierProductCategory(formData.get("category"));
  const variants = parseSupplierVariantsFromForm(formData.get("variants"));
  const stockRaw = String(formData.get("stock") ?? "0").trim();
  const priceRaw = String(formData.get("basePriceUsd") ?? "0").trim();
  const compareRaw = String(formData.get("compareAtUsd") ?? "").trim();
  const freeShipping =
    formData.get("freeShipping") === "on" ||
    formData.get("freeShipping") === "true" ||
    formData.get("freeShipping") === "1";
  const image = formData.get("image");

  if (title.length < 2) {
    return { error: "Indica un título de al menos 2 caracteres." };
  }

  const stock = Number(stockRaw);
  if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
    return { error: "El stock debe ser un número entero ≥ 0." };
  }

  const basePriceUsd = Number(priceRaw.replace(",", "."));
  if (!Number.isFinite(basePriceUsd) || basePriceUsd < 0) {
    return { error: "Indica un precio base válido en USD." };
  }

  let compareAtUsd: number | null = null;
  if (compareRaw) {
    const parsedCompare = Number(compareRaw.replace(",", "."));
    if (!Number.isFinite(parsedCompare) || parsedCompare < 0) {
      return { error: "El precio anterior (tachado) debe ser válido en USD." };
    }
    compareAtUsd = Math.round(parsedCompare * 100) / 100;
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
    compareAtUsd,
    freeShipping,
    image,
  };
}

export async function listSupplierProducts(): Promise<
  ActionResult<{ products: SupplierProduct[] }>
> {
  const auth = await requireSupplierUser();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("supplier_products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return {
    products: ((data as Record<string, unknown>[] | null) ?? []).map(mapRow),
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
  let imageUrl: string | null = null;

  if (parsed.image instanceof File && parsed.image.size > 0) {
    const uploaded = await uploadSupplierProductImage(
      admin,
      auth.user.id,
      parsed.image,
    );
    if (uploaded.error || !uploaded.publicUrl) {
      return { error: uploaded.error ?? "No se pudo subir la foto." };
    }
    imageUrl = uploaded.publicUrl;
  }

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
      compare_at_usd: parsed.compareAtUsd ?? null,
      free_shipping: parsed.freeShipping ?? false,
      image_url: imageUrl,
      is_active: true,
    })
    .select(PRODUCT_SELECT)
    .single();

  if (error || !data) {
    return { error: error?.message ?? "No se pudo crear el producto." };
  }

  const created = mapRow(data as Record<string, unknown>);
  await admin.from("supplier_product_price_history").insert({
    supplier_product_id: created.id,
    old_price_usd: null,
    new_price_usd: created.basePriceUsd,
    changed_by: auth.user.id,
    note: "Precio inicial al crear el producto.",
  });

  revalidatePath("/proveedor/dashboard");
  revalidatePath("/mercado-oculto");
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
    compare_at_usd: parsed.compareAtUsd ?? null,
    free_shipping: parsed.freeShipping ?? false,
    updated_at: new Date().toISOString(),
  };

  if (parsed.image instanceof File && parsed.image.size > 0) {
    const uploaded = await uploadSupplierProductImage(
      admin,
      auth.user.id,
      parsed.image,
    );
    if (uploaded.error || !uploaded.publicUrl) {
      return { error: uploaded.error ?? "No se pudo subir la foto." };
    }
    patch.image_url = uploaded.publicUrl;
  }

  const { data, error } = await admin
    .from("supplier_products")
    .update(patch)
    .eq("id", id)
    .eq("is_active", true)
    .select(PRODUCT_SELECT)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Producto no encontrado." };

  const updated = mapRow(data as Record<string, unknown>);

  await recordSupplierPriceChangeAndNotify({
    admin,
    supplierProductId: updated.id,
    productTitle: updated.title,
    oldPriceUsd: previousPrice,
    newPriceUsd: updated.basePriceUsd,
    changedBy: auth.user.id,
  });

  await mirrorSupplierStockToLinkedStores(admin, updated.id, updated.stock);

  revalidatePath("/proveedor/dashboard");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/dashboard/inventario");
  revalidatePath("/mercado-oculto");
  return { product: updated };
}

export async function archiveSupplierProduct(
  productId: string,
): Promise<ActionResult> {
  const auth = await requireSupplierUser();
  if (auth.error) return { error: auth.error };

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
    .eq("is_active", true);

  if (error) return { error: error.message };

  revalidatePath("/proveedor/dashboard");
  return {};
}
