import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import { isPublishedForDropship } from "@/lib/supplier/wholesale-price";
import { normalizeSupplierProductCategory } from "@/lib/supplier/categories";

export const ADMIN_SUPPLIER_STATUSES = [
  "pending",
  "active",
  "suspended",
] as const;

export type AdminSupplierStatus = (typeof ADMIN_SUPPLIER_STATUSES)[number];

export interface AdminSupplierDirectoryRow {
  userId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  whatsappUrl: string | null;
  category: string;
  status: AdminSupplierStatus;
  createdAt: string | null;
  activeProductCount: number;
  publishedProductCount: number;
  catalogVisible: boolean;
}

function normalizeSupplierStatus(value: unknown): AdminSupplierStatus {
  if (value === "pending" || value === "suspended") return value;
  return "active";
}

function buildWhatsAppUrl(phoneRaw: string): string | null {
  const normalized = normalizeWhatsAppPhone(phoneRaw);
  if (!normalized) return null;
  return `https://wa.me/${normalized}`;
}

async function loadActiveSupplierProducts(
  admin: ReturnType<typeof createAdminClient>,
  supplierIds: string[],
): Promise<
  Map<
    string,
    {
      active: number;
      published: number;
    }
  >
> {
  const counts = new Map<string, { active: number; published: number }>();
  for (const id of supplierIds) {
    counts.set(id, { active: 0, published: 0 });
  }
  if (supplierIds.length === 0) return counts;

  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await admin
      .from("supplier_products")
      .select(
        "created_by, is_active, catalog_visible, is_visible, publication_status, precio_mayorista",
      )
      .in("created_by", supplierIds)
      .eq("is_active", true)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    for (const row of rows) {
      const supplierId = String(row.created_by ?? "");
      const current = counts.get(supplierId);
      if (!current) continue;
      current.active += 1;
      if (isPublishedForDropship(row)) current.published += 1;
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return counts;
}

/** Lista todos los proveedores registrados para el directorio admin. */
export async function getAdminSuppliers(
  limit = 1000,
): Promise<AdminSupplierDirectoryRow[]> {
  const admin = createAdminClient();
  const cappedLimit = Math.min(Math.max(limit, 1), 1000);

  const { data: profiles, error } = await admin
    .from("supplier_profiles")
    .select(
      "user_id, company_name, contact_name, email, phone, product_category, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(cappedLimit);

  if (error) throw new Error(error.message);

  const rows = profiles ?? [];
  const supplierIds = rows
    .map((row) => String(row.user_id ?? ""))
    .filter(Boolean);

  const [productCounts, visibilityRows] = await Promise.all([
    loadActiveSupplierProducts(admin, supplierIds),
    supplierIds.length === 0
      ? Promise.resolve({ data: [] as Array<{
          supplier_user_id?: string;
          catalog_visible?: unknown;
        }>, error: null })
      : admin
          .from("supplier_catalog_visibility")
          .select("supplier_user_id, catalog_visible")
          .in("supplier_user_id", supplierIds),
  ]);

  if (visibilityRows.error) throw new Error(visibilityRows.error.message);

  const catalogVisibleById = new Map<string, boolean>();
  for (const row of visibilityRows.data ?? []) {
    const id = String(row.supplier_user_id ?? "");
    if (!id) continue;
    catalogVisibleById.set(id, row.catalog_visible === true);
  }

  return rows.map((row) => {
    const userId = String(row.user_id ?? "");
    const phone = String(row.phone ?? "").trim();
    const counts = productCounts.get(userId) ?? { active: 0, published: 0 };
    return {
      userId,
      companyName: String(row.company_name ?? "").trim() || "Sin empresa",
      contactName: String(row.contact_name ?? "").trim() || "—",
      email: String(row.email ?? "").trim(),
      phone,
      whatsappUrl: phone ? buildWhatsAppUrl(phone) : null,
      category: normalizeSupplierProductCategory(row.product_category),
      status: normalizeSupplierStatus(row.status),
      createdAt:
        typeof row.created_at === "string" && row.created_at
          ? row.created_at
          : null,
      activeProductCount: counts.active,
      publishedProductCount: counts.published,
      catalogVisible: catalogVisibleById.get(userId) === true,
    };
  });
}
