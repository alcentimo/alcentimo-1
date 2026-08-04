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

export interface SupplierProduct {
  id: string;
  title: string;
  description: string;
  stock: number;
  basePriceUsd: number;
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

function mapRow(row: Record<string, unknown>): SupplierProduct {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    stock: Number(row.stock) || 0,
    basePriceUsd: Number(row.base_price_usd) || 0,
    imageUrl:
      typeof row.image_url === "string" && row.image_url.trim()
        ? row.image_url
        : null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
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
    .select(
      "id, title, description, stock, base_price_usd, image_url, created_at, updated_at",
    )
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

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const stockRaw = String(formData.get("stock") ?? "0").trim();
  const priceRaw = String(formData.get("basePriceUsd") ?? "0").trim();
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

  const admin = createAdminClient();
  let imageUrl: string | null = null;

  if (image instanceof File && image.size > 0) {
    const uploaded = await uploadSupplierProductImage(
      admin,
      auth.user.id,
      image,
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
      title: title.slice(0, 180),
      description: description.slice(0, 4000),
      stock,
      base_price_usd: Math.round(basePriceUsd * 100) / 100,
      image_url: imageUrl,
      is_active: true,
    })
    .select(
      "id, title, description, stock, base_price_usd, image_url, created_at, updated_at",
    )
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

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const stockRaw = String(formData.get("stock") ?? "0").trim();
  const priceRaw = String(formData.get("basePriceUsd") ?? "0").trim();
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
  const nextPrice = Math.round(basePriceUsd * 100) / 100;

  const patch: Record<string, unknown> = {
    title: title.slice(0, 180),
    description: description.slice(0, 4000),
    stock,
    base_price_usd: nextPrice,
    updated_at: new Date().toISOString(),
  };

  if (image instanceof File && image.size > 0) {
    const uploaded = await uploadSupplierProductImage(
      admin,
      auth.user.id,
      image,
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
    .select(
      "id, title, description, stock, base_price_usd, image_url, created_at, updated_at",
    )
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Producto no encontrado." };

  const updated = mapRow(data as Record<string, unknown>);

  // Órdenes ya emitidas conservan su snapshot; solo historial + alertas a tiendas vinculadas.
  await recordSupplierPriceChangeAndNotify({
    admin,
    supplierProductId: updated.id,
    productTitle: updated.title,
    oldPriceUsd: previousPrice,
    newPriceUsd: updated.basePriceUsd,
    changedBy: auth.user.id,
  });

  revalidatePath("/proveedor/dashboard");
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
