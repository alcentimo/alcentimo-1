"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasMercadoOcultoSuperAdminUser } from "@/lib/mercado-oculto/access";
import {
  getSupportAdminAllowlist,
  normalizeSupportEmail,
} from "@/lib/support/admin-access";
import { getSupplierAllowlist } from "@/lib/supplier/access";
import {
  mapSupplierRowToMercadoCard,
  type MercadoProductCard,
} from "@/lib/mercado-oculto/types";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

const SUPPLIER_PRODUCT_SELECT =
  "id, title, description, category, stock, base_price_usd, image_url, created_by, created_at, is_active";

async function requireMercadoSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Debes iniciar sesión." } as const;
  }
  if (!hasMercadoOcultoSuperAdminUser(user)) {
    return {
      error:
        "El mercado oculto es exclusivo del Administrador General de Alcéntimo.",
    } as const;
  }
  return { user } as const;
}

/**
 * Usuarios que pueden cargar productos oficiales:
 * Super Admins + proveedores mayoristas asociados (allowlists).
 */
export async function listOfficialMayoristaUserIds(): Promise<string[]> {
  const allowedEmails = new Set(
    [...getSupportAdminAllowlist(), ...getSupplierAllowlist()].map((email) =>
      email.toLowerCase(),
    ),
  );
  if (allowedEmails.size === 0) return [];

  const admin = createAdminClient();
  const ids: string[] = [];
  let page = 1;

  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data?.users?.length) break;

    for (const user of data.users) {
      const email = normalizeSupportEmail(user.email);
      if (email && allowedEmails.has(email)) {
        ids.push(user.id);
      }
    }

    if (data.users.length < 200) break;
    page += 1;
  }

  return [...new Set(ids)];
}

/** Vitrina interna: solo productos de Super Admin / mayoristas asociados. */
export async function listMercadoProducts(options?: {
  query?: string;
  limit?: number;
}): Promise<ActionResult<{ products: MercadoProductCard[] }>> {
  const gate = await requireMercadoSuperAdmin();
  if ("error" in gate) return { error: gate.error };

  const creatorIds = await listOfficialMayoristaUserIds();
  if (creatorIds.length === 0) {
    return { products: [] };
  }

  const limit = Math.min(Math.max(options?.limit ?? 60, 1), 120);
  const admin = createAdminClient();
  let request = admin
    .from("supplier_products")
    .select(SUPPLIER_PRODUCT_SELECT)
    .eq("is_active", true)
    .in("created_by", creatorIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  const q = options?.query?.trim();
  if (q) {
    const safe = q.replace(/[%_,]/g, " ").slice(0, 80);
    if (safe) {
      request = request.or(
        `title.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%`,
      );
    }
  }

  const { data, error } = await request;
  if (error) return { error: error.message };

  const products = ((data as Record<string, unknown>[] | null) ?? []).map(
    mapSupplierRowToMercadoCard,
  );
  return { products };
}

/** Detalle de un producto mayorista oficial (Super Admin). */
export async function getMercadoProduct(
  productId: string,
): Promise<
  ActionResult<{
    product: MercadoProductCard;
    sellerUserId: string;
    sellerStoreName: string;
  }>
> {
  const gate = await requireMercadoSuperAdmin();
  if ("error" in gate) return { error: gate.error };

  if (!productId.trim()) return { error: "Producto inválido." };

  const creatorIds = await listOfficialMayoristaUserIds();
  if (creatorIds.length === 0) {
    return { error: "No hay cuentas mayoristas oficiales configuradas." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("supplier_products")
    .select(SUPPLIER_PRODUCT_SELECT)
    .eq("id", productId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Producto no encontrado o inactivo." };

  const row = data as Record<string, unknown>;
  const createdBy = String(row.created_by ?? "");
  if (!creatorIds.includes(createdBy)) {
    return {
      error:
        "Este producto no pertenece al catálogo del Administrador General ni a mayoristas asociados.",
    };
  }

  const product = mapSupplierRowToMercadoCard(row);
  return {
    product,
    sellerUserId: product.seller_user_id,
    sellerStoreName: product.store_name,
  };
}
