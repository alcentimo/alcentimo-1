import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";

export interface AdminSupplierDirectoryRow {
  userId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  whatsappUrl: string | null;
  location: string | null;
  activeProductCount: number;
}

function inferLocationFromPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("58")) return "Venezuela";
  return null;
}

function buildWhatsAppUrl(phoneRaw: string): string | null {
  const normalized = normalizeWhatsAppPhone(phoneRaw);
  if (!normalized) return null;
  return `https://wa.me/${normalized}`;
}

async function loadActiveProductCounts(
  admin: ReturnType<typeof createAdminClient>,
  supplierIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const id of supplierIds) counts.set(id, 0);
  if (supplierIds.length === 0) return counts;

  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await admin
      .from("supplier_products")
      .select("created_by")
      .in("created_by", supplierIds)
      .eq("is_active", true)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    for (const row of rows) {
      const supplierId = String(row.created_by ?? "");
      if (!counts.has(supplierId)) continue;
      counts.set(supplierId, (counts.get(supplierId) ?? 0) + 1);
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
    .select("user_id, company_name, contact_name, email, phone, created_at")
    .order("created_at", { ascending: false })
    .limit(cappedLimit);

  if (error) throw new Error(error.message);

  const rows = profiles ?? [];
  const supplierIds = rows
    .map((row) => String(row.user_id ?? ""))
    .filter(Boolean);
  const productCounts = await loadActiveProductCounts(admin, supplierIds);

  return rows.map((row) => {
    const userId = String(row.user_id ?? "");
    const phone = String(row.phone ?? "").trim();
    return {
      userId,
      companyName: String(row.company_name ?? "").trim() || "Sin empresa",
      contactName: String(row.contact_name ?? "").trim(),
      email: String(row.email ?? "").trim(),
      phone,
      whatsappUrl: phone ? buildWhatsAppUrl(phone) : null,
      location: inferLocationFromPhone(phone),
      activeProductCount: productCounts.get(userId) ?? 0,
    };
  });
}
