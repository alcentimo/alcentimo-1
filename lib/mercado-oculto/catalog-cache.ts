import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSupportAdminAllowlist,
  normalizeSupportEmail,
} from "@/lib/support/admin-access";
import { getSupplierAllowlist } from "@/lib/supplier/access";
import { SUPPLIER_PRODUCT_CATEGORIES } from "@/lib/supplier/categories";
import { MORICHE_BRAND_LABEL } from "@/lib/mercado-oculto/access";
import { resolveMayoristaDisplayName } from "@/lib/mercado-oculto/supplier-labels";
import {
  listSupplierProductImages,
  supplierImageUrls,
} from "@/lib/supplier/product-images";
import {
  mapSupplierRowToMercadoCard,
  type MercadoCatalogFacets,
  type MercadoCategoryFacet,
  type MercadoProductCard,
  type MercadoSupplierFacet,
} from "@/lib/mercado-oculto/types";
import {
  applyDropshipVisibleProductFilter,
  isPublishedForDropship,
} from "@/lib/supplier/wholesale-price";

export const MERCADO_CATALOG_CACHE_TAG = "mercado-catalog";

const SUPPLIER_PRODUCT_SELECT =
  "id, title, description, category, variants, stock, precio_mayorista, compare_at_usd, free_shipping, image_url, created_by, created_at, is_active, publication_status, catalog_visible";

export type MercadoCatalogSnapshot = {
  products: MercadoProductCard[];
  facets: MercadoCatalogFacets;
  fetchedAt: string;
};

async function listOfficialMayoristaUserIdsUncached(): Promise<string[]> {
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

const getCachedMayoristaUserIds = unstable_cache(
  async () => listOfficialMayoristaUserIdsUncached(),
  ["mercado-official-mayorista-ids"],
  { revalidate: 120, tags: [MERCADO_CATALOG_CACHE_TAG] },
);

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
      labels.set(
        id,
        resolveMayoristaDisplayName(data.user, {
          isSupportAdmin: Boolean(email && adminEmails.has(email)),
        }),
      );
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
  let freeShippingCount = 0;

  for (const row of rows) {
    const category = String(row.category ?? "otros");
    categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);

    const creator = String(row.created_by ?? "");
    if (creator) {
      supplierCounts.set(creator, (supplierCounts.get(creator) ?? 0) + 1);
    }

    const price = Number(row.precio_mayorista) || 0;
    if (price < priceMin) priceMin = price;
    if (price > priceMax) priceMax = price;
    if (row.free_shipping) freeShippingCount += 1;
  }

  if (!Number.isFinite(priceMin)) priceMin = 0;

  const categories: MercadoCategoryFacet[] = SUPPLIER_PRODUCT_CATEGORIES.map(
    (item) => ({
      value: item.value,
      label: item.label,
      count: categoryCounts.get(item.value) ?? 0,
    }),
  ).filter((item) => item.count > 0);

  // Todos los mayoristas con productos activos, ordenados por volumen.
  const suppliers: MercadoSupplierFacet[] = [...supplierCounts.entries()]
    .map(([id, count]) => ({
      id,
      label: labels.get(id) ?? MORICHE_BRAND_LABEL,
      count,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, "es");
    });

  return {
    categories,
    suppliers,
    priceMin,
    priceMax,
    freeShippingCount,
  };
}

async function loadMercadoCatalogUncached(): Promise<MercadoCatalogSnapshot> {
  const empty: MercadoCatalogSnapshot = {
    products: [],
    facets: {
      categories: [],
      suppliers: [],
      priceMin: 0,
      priceMax: 0,
      freeShippingCount: 0,
    },
    fetchedAt: new Date().toISOString(),
  };

  const creatorIds = await getCachedMayoristaUserIds();
  if (creatorIds.length === 0) return empty;

  const admin = createAdminClient();
  const { data, error } = await applyDropshipVisibleProductFilter(
    admin.from("supplier_products").select(SUPPLIER_PRODUCT_SELECT),
  )
    .in("created_by", creatorIds)
    .order("created_at", { ascending: false })
    .limit(160);

  if (error) {
    throw new Error(error.message);
  }

  const rows = ((data as Record<string, unknown>[] | null) ?? []).filter(
    isPublishedForDropship,
  );
  const creatorSet = [
    ...new Set(rows.map((row) => String(row.created_by ?? "")).filter(Boolean)),
  ];
  const labels = await mapCreatorLabels(creatorSet);
  const facets = buildFacets(rows, labels);
  const galleryByProduct = await listSupplierProductImages(
    admin,
    rows.map((row) => String(row.id)),
  );
  const products = rows.map((row) => {
    const id = String(row.id);
    const cover =
      typeof row.image_url === "string" && row.image_url.trim()
        ? row.image_url.trim()
        : null;
    const urls = supplierImageUrls(galleryByProduct.get(id) ?? [], cover);
    return mapSupplierRowToMercadoCard(row, MORICHE_BRAND_LABEL, urls);
  });

  return {
    products,
    facets,
    fetchedAt: new Date().toISOString(),
  };
}

/** Catálogo completo cacheado (~60s) para navegación SPA sin pegarle a la DB. */
export const getCachedMercadoCatalog = unstable_cache(
  async () => loadMercadoCatalogUncached(),
  ["mercado-oculto-catalog-v6"],
  { revalidate: 60, tags: [MERCADO_CATALOG_CACHE_TAG] },
);

export async function getCachedOfficialMayoristaUserIds(): Promise<string[]> {
  return getCachedMayoristaUserIds();
}

export { SUPPLIER_PRODUCT_SELECT };
