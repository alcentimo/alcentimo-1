import { createAdminClient } from "@/lib/supabase/admin";
import { slugify, uniqueSlug } from "@/lib/slugify";
import {
  applyDropshipVisibleProductFilter,
  DROPSHIP_SUPPLIER_PRODUCT_SELECT,
  resolveSuggestedRetailUsd,
} from "@/lib/supplier/wholesale-price";
import {
  mapSupplierRowToMercadoCard,
  type MercadoProductCard,
} from "@/lib/mercado-oculto/types";
import { parsePublicCatalogEnabled } from "@/lib/catalog/supplier-public-catalog-flag";
import {
  normalizeSupplierStorefrontConfig,
} from "@/lib/supplier/storefront-types";
import type {
  PaymentsSettings,
  ShippingSettings,
} from "@/lib/store-settings/types";

export const SUPPLIER_PUBLIC_CATALOG_PREFIX = "/vitrina";

export function supplierPublicCatalogPath(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  return `${SUPPLIER_PUBLIC_CATALOG_PREFIX}/${encodeURIComponent(normalized)}`;
}

export function supplierPublicCatalogProductPath(
  slug: string,
  productId: string,
): string {
  return `${supplierPublicCatalogPath(slug)}/producto/${encodeURIComponent(productId)}`;
}

export type SupplierPublicCatalogProfile = {
  userId: string;
  companyName: string;
  slug: string;
  showPublicCatalog: boolean;
  logoUrl: string | null;
  description: string;
  shipping: ShippingSettings;
  payments: PaymentsSettings;
};

export type SupplierPublicCatalogPage = {
  profile: SupplierPublicCatalogProfile;
  products: MercadoProductCard[];
};

function mapPublicCard(
  row: Record<string, unknown>,
  supplierLabel: string,
): MercadoProductCard {
  const card = mapSupplierRowToMercadoCard(row, supplierLabel);
  const retail = resolveSuggestedRetailUsd(row);
  if (retail != null && retail > 0) {
    return {
      ...card,
      price_usd: retail,
      compare_at_usd: null,
      discount_percent: null,
    };
  }
  return card;
}

function mapProfile(
  row: Record<string, unknown>,
): SupplierPublicCatalogProfile | null {
  const userId = String(row.user_id ?? "");
  const slug = String(row.public_catalog_slug ?? "").trim().toLowerCase();
  if (!userId) return null;
  const companyName =
    String(row.trade_name ?? "").trim() ||
    String(row.company_name ?? "").trim() ||
    "Proveedor";
  const config = normalizeSupplierStorefrontConfig(row.storefront_config);
  return {
    userId,
    companyName,
    slug,
    showPublicCatalog: parsePublicCatalogEnabled(row.show_public_catalog),
    logoUrl:
      typeof row.logo_url === "string" && row.logo_url.trim()
        ? row.logo_url.trim()
        : null,
    description: String(row.public_description ?? "").trim(),
    shipping: config.shipping,
    payments: config.payments,
  };
}

export async function allocateSupplierPublicCatalogSlug(input: {
  admin: ReturnType<typeof createAdminClient>;
  supplierUserId: string;
  companyName: string;
  existingSlug?: string | null;
}): Promise<string> {
  const current = input.existingSlug?.trim().toLowerCase() ?? "";
  if (current) return current;

  const base = slugify(input.companyName) || "proveedor";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate =
      attempt === 0
        ? base
        : uniqueSlug(
            base,
            `${attempt}${input.supplierUserId.replace(/-/g, "")}`,
          );
    const { data, error } = await input.admin
      .from("supplier_profiles")
      .select("user_id")
      .eq("public_catalog_slug", candidate)
      .maybeSingle();
    if (error) return candidate;
    const owner = data
      ? String((data as { user_id?: string }).user_id ?? "")
      : "";
    if (!owner || owner === input.supplierUserId) return candidate;
  }
  return uniqueSlug(base, input.supplierUserId.replace(/-/g, ""));
}

export async function getSupplierPublicCatalogBySlug(
  slug: string,
): Promise<SupplierPublicCatalogPage | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const admin = createAdminClient();
  let profileQuery = await admin
    .from("supplier_profiles")
    .select(
      "user_id, company_name, trade_name, logo_url, public_description, status, show_public_catalog, public_catalog_slug, storefront_config",
    )
    .eq("public_catalog_slug", normalized)
    .maybeSingle();

  if (profileQuery.error) {
    profileQuery = await admin
      .from("supplier_profiles")
      .select(
        "user_id, company_name, status, show_public_catalog, public_catalog_slug",
      )
      .eq("public_catalog_slug", normalized)
      .maybeSingle();
  }

  if (profileQuery.error || !profileQuery.data) return null;
  const row = profileQuery.data as Record<string, unknown>;
  if (String(row.status ?? "") !== "active") return null;
  if (!parsePublicCatalogEnabled(row.show_public_catalog)) return null;

  const profile = mapProfile(row);
  if (!profile || !profile.slug) return null;

  const query = applyDropshipVisibleProductFilter(
    admin
      .from("supplier_products")
      .select(DROPSHIP_SUPPLIER_PRODUCT_SELECT)
      .eq("created_by", profile.userId)
      .order("created_at", { ascending: false }),
  );

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const products = ((data as Record<string, unknown>[] | null) ?? []).map(
    (item) => mapPublicCard(item, profile.companyName),
  );

  return { profile, products };
}

export async function getSupplierPublicCatalogProduct(input: {
  slug: string;
  productId: string;
}): Promise<{
  profile: SupplierPublicCatalogProfile;
  product: MercadoProductCard;
} | null> {
  const page = await getSupplierPublicCatalogBySlug(input.slug);
  if (!page) return null;
  const product = page.products.find(
    (item) => item.product_id === input.productId,
  );
  if (!product) return null;
  return { profile: page.profile, product };
}
