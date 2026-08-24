import { createAdminClient } from "@/lib/supabase/admin";
import { parsePublicCatalogEnabled } from "@/lib/catalog/supplier-public-catalog-flag";
import {
  defaultSupplierStorefrontConfig,
  normalizeSupplierStorefrontConfig,
  type SupplierPublicStorefront,
} from "@/lib/supplier/storefront-types";

const STOREFRONT_SELECT =
  "user_id, company_name, trade_name, logo_url, public_description, status, show_public_catalog, public_catalog_slug, storefront_config";

const STOREFRONT_SELECT_FALLBACK =
  "user_id, company_name, status, show_public_catalog, public_catalog_slug";

function mapStorefront(
  row: Record<string, unknown>,
): SupplierPublicStorefront | null {
  const userId = String(row.user_id ?? "").trim();
  if (!userId) return null;
  const companyName = String(row.company_name ?? "").trim() || "Proveedor";
  const tradeName = String(row.trade_name ?? "").trim() || companyName;
  const description = String(row.public_description ?? "").trim();
  const logoUrl =
    typeof row.logo_url === "string" && row.logo_url.trim()
      ? row.logo_url.trim()
      : null;
  const slug =
    typeof row.public_catalog_slug === "string" &&
    row.public_catalog_slug.trim()
      ? row.public_catalog_slug.trim().toLowerCase()
      : null;
  const config = normalizeSupplierStorefrontConfig(row.storefront_config);
  return {
    userId,
    companyName,
    tradeName,
    description,
    logoUrl,
    showPublicCatalog: parsePublicCatalogEnabled(row.show_public_catalog),
    publicCatalogSlug: slug,
    shipping: config.shipping,
    payments: config.payments,
  };
}

async function loadProfileRow(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const full = await admin
    .from("supplier_profiles")
    .select(STOREFRONT_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (!full.error && full.data) {
    return full.data as Record<string, unknown>;
  }

  const missingColumns =
    Boolean(full.error?.message) &&
    (full.error.message.includes("show_public_catalog") ||
      full.error.message.includes("public_catalog_slug") ||
      full.error.message.includes("trade_name") ||
      full.error.message.includes("storefront_config") ||
      full.error.message.includes("public_description") ||
      full.error.message.includes("logo_url"));

  if (!missingColumns) return null;

  const fallback = await admin
    .from("supplier_profiles")
    .select("user_id, company_name, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (fallback.error || !fallback.data) return null;
  return fallback.data as Record<string, unknown>;
}

export async function getSupplierPublicStorefront(
  userId: string,
): Promise<SupplierPublicStorefront | null> {
  if (!userId.trim()) return null;
  const admin = createAdminClient();
  const row = await loadProfileRow(admin, userId);
  if (!row) return null;
  if (String(row.status ?? "") !== "active") return null;
  return (
    mapStorefront(row) ?? {
      userId,
      companyName: "Proveedor",
      tradeName: "Proveedor",
      description: "",
      logoUrl: null,
      showPublicCatalog: false,
      publicCatalogSlug: null,
      ...defaultSupplierStorefrontConfig(),
    }
  );
}

export { STOREFRONT_SELECT, STOREFRONT_SELECT_FALLBACK, mapStorefront };
