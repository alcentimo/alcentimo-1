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
  isSupplierProductCategory,
  SUPPLIER_PRODUCT_CATEGORIES,
} from "@/lib/supplier/categories";
import {
  mapSupplierRowToMercadoCard,
  type MercadoCatalogFacets,
  type MercadoCategoryFacet,
  type MercadoProductCard,
  type MercadoSupplierFacet,
} from "@/lib/mercado-oculto/types";

type ActionResult<T extends object = object> = {
  error?: string;
} & Partial<T>;

const SUPPLIER_PRODUCT_SELECT =
  "id, title, description, category, variants, stock, base_price_usd, image_url, created_by, created_at, is_active";

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

async function mapCreatorLabels(
  creatorIds: string[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  if (creatorIds.length === 0) return labels;

  const admin = createAdminClient();
  const adminEmails = new Set(getSupportAdminAllowlist());

  await Promise.all(
    creatorIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      const email = normalizeSupportEmail(data.user?.email);
      if (!email) {
        labels.set(id, "Mayorista Oficial Alcéntimo");
        return;
      }
      if (adminEmails.has(email)) {
        labels.set(id, "Alcéntimo · Super Admin");
        return;
      }
      const local = email.split("@")[0] ?? email;
      labels.set(id, `Mayorista · ${local}`);
    }),
  );

  return labels;
}

function buildFacets(
  rows: Record<string, unknown>[],
  labels: Map<string, string>,
): MercadoCatalogFacets {
  const categoryCounts = new Map<string, number>();
  const supplierCounts = new Map<string, number>();
  let priceMin = Number.POSITIVE_INFINITY;
  let priceMax = 0;

  for (const row of rows) {
    const category = String(row.category ?? "otros");
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);

    const creator = String(row.created_by ?? "");
    if (creator) {
      supplierCounts.set(creator, (supplierCounts.get(creator) ?? 0) + 1);
    }

    const price = Number(row.base_price_usd) || 0;
    if (price < priceMin) priceMin = price;
    if (price > priceMax) priceMax = price;
  }

  if (!Number.isFinite(priceMin)) priceMin = 0;

  const categories: MercadoCategoryFacet[] = SUPPLIER_PRODUCT_CATEGORIES.map(
    (item) => ({
      value: item.value,
      label: item.label,
      count: categoryCounts.get(item.value) ?? 0,
    }),
  ).filter((item) => item.count > 0);

  const suppliers: MercadoSupplierFacet[] = [...supplierCounts.entries()]
    .map(([id, count]) => ({
      id,
      label: labels.get(id) ?? "Mayorista Oficial Alcéntimo",
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    categories,
    suppliers,
    priceMin,
    priceMax,
  };
}

export type ListMercadoProductsInput = {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  supplierUserId?: string;
  limit?: number;
};

/** Vitrina B2B: productos oficiales con filtros de marketplace. */
export async function listMercadoProducts(
  options?: ListMercadoProductsInput,
): Promise<
  ActionResult<{ products: MercadoProductCard[]; facets: MercadoCatalogFacets }>
> {
  const gate = await requireMercadoSuperAdmin();
  if ("error" in gate) return { error: gate.error };

  const creatorIds = await listOfficialMayoristaUserIds();
  if (creatorIds.length === 0) {
    return {
      products: [],
      facets: { categories: [], suppliers: [], priceMin: 0, priceMax: 0 },
    };
  }

  const limit = Math.min(Math.max(options?.limit ?? 96, 1), 160);
  const admin = createAdminClient();

  // Facets over the full official catalog (before search/price filters).
  const { data: facetRows, error: facetError } = await admin
    .from("supplier_products")
    .select("category, created_by, base_price_usd")
    .eq("is_active", true)
    .in("created_by", creatorIds)
    .limit(500);

  if (facetError) return { error: facetError.message };

  const facetCreators = [
    ...new Set(
      ((facetRows as Record<string, unknown>[] | null) ?? [])
        .map((row) => String(row.created_by ?? ""))
        .filter(Boolean),
    ),
  ];
  const labels = await mapCreatorLabels(facetCreators);
  const facets = buildFacets(
    (facetRows as Record<string, unknown>[] | null) ?? [],
    labels,
  );

  let request = admin
    .from("supplier_products")
    .select(SUPPLIER_PRODUCT_SELECT)
    .eq("is_active", true)
    .in("created_by", creatorIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  const category = options?.category?.trim();
  if (category && isSupplierProductCategory(category)) {
    request = request.eq("category", category);
  }

  const supplierUserId = options?.supplierUserId?.trim();
  if (supplierUserId && creatorIds.includes(supplierUserId)) {
    request = request.eq("created_by", supplierUserId);
  }

  if (
    typeof options?.minPrice === "number" &&
    Number.isFinite(options.minPrice)
  ) {
    request = request.gte("base_price_usd", Math.max(0, options.minPrice));
  }
  if (
    typeof options?.maxPrice === "number" &&
    Number.isFinite(options.maxPrice) &&
    options.maxPrice > 0
  ) {
    request = request.lte("base_price_usd", options.maxPrice);
  }

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

  const rows = (data as Record<string, unknown>[] | null) ?? [];
  const productCreatorIds = [
    ...new Set(rows.map((row) => String(row.created_by ?? "")).filter(Boolean)),
  ];
  const productLabels =
    productCreatorIds.length > 0
      ? await mapCreatorLabels(productCreatorIds)
      : labels;

  const products = rows.map((row) =>
    mapSupplierRowToMercadoCard(
      row,
      productLabels.get(String(row.created_by ?? "")) ??
        "Mayorista Oficial Alcéntimo",
    ),
  );

  return { products, facets };
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

  const labels = await mapCreatorLabels([createdBy]);
  const product = mapSupplierRowToMercadoCard(
    row,
    labels.get(createdBy) ?? "Mayorista Oficial Alcéntimo",
  );
  return {
    product,
    sellerUserId: product.seller_user_id,
    sellerStoreName: product.supplier_label,
  };
}
