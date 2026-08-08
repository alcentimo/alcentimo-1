import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeDbPlan } from "@/lib/plans/plan-activation";
import type { ProfilePlanDb } from "@/lib/database.types";
import { getStoreCatalogPublicUrl } from "@/lib/store-host";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import { getStoreVisitMonthTotalsByStoreIds } from "@/lib/analytics/get-page-visit-stats";

export interface AdminUserRow {
  /** Owner user id (para acciones de plan). */
  id: string;
  /** Clave estable de fila (storeId o user-…). */
  rowKey: string;
  email: string | null;
  plan: ProfilePlanDb;
  subscriptionStatus: string;
  productCount: number;
  storeCount: number;
  periodEndsAt: string | null;
  /** Fecha de registro de la cuenta (auth.users / profiles / store). */
  createdAt: string | null;
  storeId: string | null;
  storeName: string;
  storeSlug: string | null;
  catalogUrl: string | null;
  whatsappPhone: string | null;
  whatsappUrl: string | null;
  /** Visitas únicas del mes actual al catálogo. */
  catalogVisitsMonth: number;
}

export interface AdminUserFilters {
  plan?: ProfilePlanDb | "all";
  minProducts?: number;
  maxProducts?: number;
  search?: string;
  limit?: number;
}

function extractWhatsAppFromConfig(config: unknown): string | null {
  if (!config || typeof config !== "object") return null;
  const contact = (config as { contact?: unknown }).contact;
  if (!contact || typeof contact !== "object") return null;

  const phones = (contact as { whatsappPhones?: unknown }).whatsappPhones;
  if (Array.isArray(phones)) {
    for (const phone of phones) {
      if (typeof phone === "string" && phone.trim()) return phone.trim();
    }
  }

  const legacy = (contact as { whatsappPhone?: unknown }).whatsappPhone;
  if (typeof legacy === "string" && legacy.trim()) return legacy.trim();
  return null;
}

function buildWhatsAppLink(phoneRaw: string | null): {
  phone: string | null;
  url: string | null;
} {
  if (!phoneRaw) return { phone: null, url: null };
  const normalized = normalizeWhatsAppPhone(phoneRaw);
  if (!normalized) {
    return { phone: phoneRaw.trim() || null, url: null };
  }
  return { phone: normalized, url: `https://wa.me/${normalized}` };
}

/** Lista tiendas/clientes con plan del dueño, WhatsApp y enlace al catálogo. */
export async function getAdminUsers(
  filters: AdminUserFilters = {},
): Promise<AdminUserRow[]> {
  const admin = createAdminClient();
  const limit = Math.min(Math.max(filters.limit ?? 500, 1), 1000);

  const { data: profiles, error } = await admin
    .from("profiles")
    .select(
      "id, plan, subscription_status, subscription_period_ends_at, created_at",
    )
    .limit(3000);

  if (error) throw new Error(error.message);

  const profileIds = (profiles ?? []).map((p) => p.id);
  if (profileIds.length === 0) return [];

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p] as const));

  const { data: stores, error: storesError } = await admin
    .from("stores")
    .select(
      "id, owner_id, name, slug, custom_domain, custom_domain_verified, created_at",
    )
    .in("owner_id", profileIds)
    .order("created_at", { ascending: false });

  if (storesError) throw new Error(storesError.message);

  const storeIds = (stores ?? []).map((s) => s.id);
  const ownerByStore = new Map(
    (stores ?? []).map((s) => [s.id, s.owner_id] as const),
  );
  const storeCountByOwner = new Map<string, number>();
  for (const store of stores ?? []) {
    storeCountByOwner.set(
      store.owner_id,
      (storeCountByOwner.get(store.owner_id) ?? 0) + 1,
    );
  }

  const productCountByStore = new Map<string, number>();
  const productCountByOwner = new Map<string, number>();

  if (storeIds.length > 0) {
    const { data: products, error: productsError } = await admin
      .from("products")
      .select("store_id")
      .in("store_id", storeIds)
      .eq("is_active", true)
      .eq("is_deleted", false);

    if (productsError) throw new Error(productsError.message);

    for (const product of products ?? []) {
      productCountByStore.set(
        product.store_id,
        (productCountByStore.get(product.store_id) ?? 0) + 1,
      );
      const ownerId = ownerByStore.get(product.store_id);
      if (!ownerId) continue;
      productCountByOwner.set(
        ownerId,
        (productCountByOwner.get(ownerId) ?? 0) + 1,
      );
    }
  }

  const whatsappByStore = new Map<string, string | null>();
  if (storeIds.length > 0) {
    const { data: settingsRows, error: settingsError } = await admin
      .from("store_settings")
      .select("store_id, config")
      .in("store_id", storeIds);

    if (settingsError) throw new Error(settingsError.message);

    for (const row of settingsRows ?? []) {
      whatsappByStore.set(row.store_id, extractWhatsAppFromConfig(row.config));
    }
  }

  const emailById = new Map<string, string | null>();
  /** Fecha de registro de la cuenta (auth.users.created_at). */
  const registeredAtById = new Map<string, string | null>();
  for (let i = 0; i < profileIds.length; i += 40) {
    const chunk = profileIds.slice(i, i + 40);
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const { data } = await admin.auth.admin.getUserById(id);
          emailById.set(id, data.user?.email ?? null);
          registeredAtById.set(id, data.user?.created_at ?? null);
        } catch {
          emailById.set(id, null);
          registeredAtById.set(id, null);
        }
      }),
    );
  }

  const visitTotalsByStore = await getStoreVisitMonthTotalsByStoreIds(
    admin,
    storeIds,
  );

  const planFilter =
    filters.plan && filters.plan !== "all" ? filters.plan : null;
  const search = filters.search?.trim().toLowerCase() ?? "";
  const minProducts = filters.minProducts;
  const maxProducts = filters.maxProducts;

  const ownersWithStore = new Set((stores ?? []).map((s) => s.owner_id));
  const rows: AdminUserRow[] = [];

  for (const store of stores ?? []) {
    const profile = profileById.get(store.owner_id);
    if (!profile) continue;

    const plan = normalizeDbPlan(profile.plan);
    const productCount = productCountByStore.get(store.id) ?? 0;
    const email = emailById.get(store.owner_id) ?? null;
    const whatsappRaw = whatsappByStore.get(store.id) ?? null;
    const { phone: whatsappPhone, url: whatsappUrl } =
      buildWhatsAppLink(whatsappRaw);

    if (planFilter && plan !== planFilter) continue;
    if (minProducts != null && productCount < minProducts) continue;
    if (maxProducts != null && productCount > maxProducts) continue;
    if (search) {
      const hay = [
        email ?? "",
        store.name,
        store.slug,
        whatsappPhone ?? "",
        whatsappRaw ?? "",
        store.owner_id,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(search)) continue;
    }

    rows.push({
      id: store.owner_id,
      rowKey: store.id,
      email,
      plan,
      subscriptionStatus: profile.subscription_status ?? "none",
      productCount,
      storeCount: storeCountByOwner.get(store.owner_id) ?? 0,
      periodEndsAt: profile.subscription_period_ends_at ?? null,
      // Registro de la cuenta; fallback a perfil / creación de tienda.
      createdAt:
        registeredAtById.get(store.owner_id) ??
        profile.created_at ??
        store.created_at ??
        null,
      storeId: store.id,
      storeName: store.name,
      storeSlug: store.slug,
      catalogUrl: getStoreCatalogPublicUrl(store.slug, "/", {
        customDomain: store.custom_domain ?? null,
        customDomainVerified: Boolean(store.custom_domain_verified),
      }),
      whatsappPhone,
      whatsappUrl,
      catalogVisitsMonth: visitTotalsByStore.get(store.id) ?? 0,
    });
  }

  // Dueños sin tienda: siguen visibles para acciones de plan.
  for (const profile of profiles ?? []) {
    if (ownersWithStore.has(profile.id)) continue;

    const plan = normalizeDbPlan(profile.plan);
    const productCount = productCountByOwner.get(profile.id) ?? 0;
    const email = emailById.get(profile.id) ?? null;

    if (planFilter && plan !== planFilter) continue;
    if (minProducts != null && productCount < minProducts) continue;
    if (maxProducts != null && productCount > maxProducts) continue;
    if (search) {
      const hay = `${email ?? ""} ${profile.id}`.toLowerCase();
      if (!hay.includes(search)) continue;
    }

    rows.push({
      id: profile.id,
      rowKey: `user-${profile.id}`,
      email,
      plan,
      subscriptionStatus: profile.subscription_status ?? "none",
      productCount,
      storeCount: 0,
      periodEndsAt: profile.subscription_period_ends_at ?? null,
      createdAt:
        registeredAtById.get(profile.id) ?? profile.created_at ?? null,
      storeId: null,
      storeName: "Sin tienda",
      storeSlug: null,
      catalogUrl: null,
      whatsappPhone: null,
      whatsappUrl: null,
      catalogVisitsMonth: 0,
    });
  }

  rows.sort((a, b) => {
    const visitsCmp = (b.catalogVisitsMonth ?? 0) - (a.catalogVisitsMonth ?? 0);
    if (visitsCmp !== 0) return visitsCmp;
    return a.storeName.localeCompare(b.storeName, "es");
  });

  return rows.slice(0, limit);
}
