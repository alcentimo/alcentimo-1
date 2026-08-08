import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminPlanMetrics } from "@/lib/admin/get-admin-metrics";
import { normalizeDbPlan } from "@/lib/plans/plan-activation";
import { fetchPlanSettings } from "@/lib/plans/get-plan-settings";
import { PLAN_SETTINGS_KEYS } from "@/lib/plans/plan-settings";
import type {
  AdminAssistantContext,
  AdminAssistantStoreRow,
} from "@/lib/ai/admin-assistant-types";

const ADMIN_ASSISTANT_TIMEZONE = "America/Caracas";

function formatLocalDate(
  date: Date,
  timeZone = ADMIN_ASSISTANT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shiftLocalDate(isoLocalDate: string, days: number): string {
  const [year, month, day] = isoLocalDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year!, month! - 1, day!));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

const STOP_WORDS = new Set([
  "cual",
  "cuál",
  "cuanto",
  "cuánto",
  "cuantos",
  "cuántos",
  "cuantas",
  "cuántas",
  "como",
  "cómo",
  "donde",
  "dónde",
  "tiene",
  "tienen",
  "hay",
  "esta",
  "está",
  "estan",
  "están",
  "para",
  "sobre",
  "correo",
  "email",
  "tienda",
  "tiendas",
  "usuario",
  "usuarios",
  "pago",
  "pagos",
  "plan",
  "planes",
  "pendiente",
  "pendientes",
  "activo",
  "activos",
  "slug",
  "nombre",
  "dame",
  "dime",
  "muestra",
  "lista",
  "resumen",
  "del",
  "de",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "con",
  "por",
  "que",
  "qué",
  "es",
  "son",
  "al",
  "en",
  "y",
  "o",
  "a",
]);

function extractSearchTerms(question: string): string[] {
  const terms = new Set<string>();
  const quoted = question.match(/["“”']([^"“”']{2,80})["“”']/g) ?? [];
  for (const match of quoted) {
    const cleaned = match.replace(/^["“”']|["“”']$/g, "").trim().toLowerCase();
    if (cleaned.length >= 2) terms.add(cleaned);
  }

  const emails = question.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [];
  for (const email of emails) {
    terms.add(email.trim().toLowerCase());
  }

  const words = question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9@._-]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  for (const word of words.slice(0, 8)) {
    terms.add(word);
  }

  return [...terms].slice(0, 6);
}

type OwnerAuthMeta = {
  email: string | null;
  /** auth.users.created_at */
  registeredAt: string | null;
};

async function resolveOwnerAuthMeta(
  ownerIds: string[],
): Promise<Map<string, OwnerAuthMeta>> {
  const admin = createAdminClient();
  const metaById = new Map<string, OwnerAuthMeta>();
  const unique = [...new Set(ownerIds)].slice(0, 200);

  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30);
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const { data } = await admin.auth.admin.getUserById(id);
          metaById.set(id, {
            email: data.user?.email?.trim().toLowerCase() ?? null,
            registeredAt: data.user?.created_at ?? null,
          });
        } catch {
          metaById.set(id, { email: null, registeredAt: null });
        }
      }),
    );
  }

  return metaById;
}

function toStoreRow(input: {
  name: string;
  slug: string;
  isActive: boolean;
  rubro: string | null;
  ownerEmail: string | null;
  ownerPlan: string | null;
  ownerSubscriptionStatus: string | null;
  storeCreatedAt: string | null;
  accountRegisteredAt: string | null;
}): AdminAssistantStoreRow {
  return {
    name: input.name,
    slug: input.slug,
    isActive: input.isActive,
    rubro: input.rubro,
    ownerEmail: input.ownerEmail,
    ownerPlan: input.ownerPlan,
    ownerSubscriptionStatus: input.ownerSubscriptionStatus,
    storeCreatedAt: input.storeCreatedAt,
    accountRegisteredAt: input.accountRegisteredAt,
  };
}

/**
 * Contexto operativo del SaaS para el asistente IA gerencial (service role).
 * Incluye métricas, planes, pagos, tiendas con fechas de registro
 * (auth.users.created_at / stores.created_at) y búsquedas dirigidas
 * según la última pregunta del admin.
 */
export async function getAdminAssistantContext(
  latestQuestion?: string | null,
): Promise<AdminAssistantContext> {
  const admin = createAdminClient();
  const notes: string[] = [];
  const metrics = await getAdminPlanMetrics();
  const planSettings = await fetchPlanSettings();

  const { data: payments, error: paymentsError } = await admin
    .from("manual_payments")
    .select(
      "id, user_id, plan_id, status, amount_due_usd, created_at, reference_number",
    )
    .order("created_at", { ascending: false })
    .limit(400);

  if (paymentsError) {
    notes.push(`Pagos: ${paymentsError.message}`);
  }

  const paymentStatusCounts: Record<string, number> = {};
  for (const payment of payments ?? []) {
    const status = String(payment.status ?? "unknown");
    paymentStatusCounts[status] = (paymentStatusCounts[status] ?? 0) + 1;
  }

  const pendingRows = (payments ?? []).filter(
    (payment) =>
      payment.status === "pending" || payment.status === "needs_correction",
  );
  const pendingOwnerIds = pendingRows.slice(0, 40).map((p) => p.user_id);
  const pendingAuth = await resolveOwnerAuthMeta(pendingOwnerIds);

  const { data: pendingStores } = await admin
    .from("stores")
    .select("name, owner_id")
    .in("owner_id", pendingOwnerIds.length > 0 ? pendingOwnerIds : ["00000000-0000-0000-0000-000000000000"]);

  const storesByOwner = new Map<string, string[]>();
  for (const store of pendingStores ?? []) {
    const list = storesByOwner.get(store.owner_id) ?? [];
    list.push(store.name);
    storesByOwner.set(store.owner_id, list);
  }

  const pendingPaymentsSample = pendingRows.slice(0, 25).map((payment) => ({
    id: payment.id,
    userEmail: pendingAuth.get(payment.user_id)?.email ?? null,
    planId: String(payment.plan_id),
    status: String(payment.status),
    amountDueUsd:
      payment.amount_due_usd == null ? null : Number(payment.amount_due_usd),
    storeNames: storesByOwner.get(payment.user_id) ?? [],
    createdAt: String(payment.created_at),
  }));

  const { data: stores, error: storesError } = await admin
    .from("stores")
    .select("id, name, slug, is_active, rubro_tienda, owner_id, created_at")
    .order("created_at", { ascending: false })
    .limit(120);

  if (storesError) {
    notes.push(`Tiendas: ${storesError.message}`);
  }

  const ownerIds = (stores ?? []).map((store) => store.owner_id);
  const ownerAuth = await resolveOwnerAuthMeta(ownerIds);

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, plan, subscription_status, subscription_period_ends_at")
    .in(
      "id",
      ownerIds.length > 0 ? ownerIds : ["00000000-0000-0000-0000-000000000000"],
    );

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile] as const),
  );

  const storesSample = (stores ?? []).map((store) => {
    const profile = profileById.get(store.owner_id);
    const auth = ownerAuth.get(store.owner_id);
    return toStoreRow({
      name: store.name,
      slug: store.slug,
      isActive: Boolean(store.is_active),
      rubro: store.rubro_tienda,
      ownerEmail: auth?.email ?? null,
      ownerPlan: profile ? normalizeDbPlan(profile.plan) : null,
      ownerSubscriptionStatus: profile?.subscription_status ?? null,
      storeCreatedAt: store.created_at ?? null,
      accountRegisteredAt: auth?.registeredAt ?? store.created_at ?? null,
    });
  });

  // Altas recientes para consultas temporales (“hoy”, “esta semana”…).
  const recentSince = new Date();
  recentSince.setUTCDate(recentSince.getUTCDate() - 14);
  const { data: recentStores, error: recentStoresError } = await admin
    .from("stores")
    .select("id, name, slug, is_active, rubro_tienda, owner_id, created_at")
    .gte("created_at", recentSince.toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  if (recentStoresError) {
    notes.push(`Altas recientes: ${recentStoresError.message}`);
  }

  const recentOwnerIds = (recentStores ?? []).map((store) => store.owner_id);
  const recentAuth = await resolveOwnerAuthMeta(recentOwnerIds);
  const { data: recentProfiles } = await admin
    .from("profiles")
    .select("id, plan, subscription_status")
    .in(
      "id",
      recentOwnerIds.length > 0
        ? recentOwnerIds
        : ["00000000-0000-0000-0000-000000000000"],
    );
  const recentProfileById = new Map(
    (recentProfiles ?? []).map((profile) => [profile.id, profile] as const),
  );

  const recentRegistrations = (recentStores ?? []).map((store) => {
    const profile = recentProfileById.get(store.owner_id);
    const auth = recentAuth.get(store.owner_id);
    return toStoreRow({
      name: store.name,
      slug: store.slug,
      isActive: Boolean(store.is_active),
      rubro: store.rubro_tienda,
      ownerEmail: auth?.email ?? null,
      ownerPlan: profile ? normalizeDbPlan(profile.plan) : null,
      ownerSubscriptionStatus: profile?.subscription_status ?? null,
      storeCreatedAt: store.created_at ?? null,
      accountRegisteredAt: auth?.registeredAt ?? store.created_at ?? null,
    });
  });

  // Usuarios cerca del límite de productos (aprox. con conteo activo por dueño).
  const { data: allStores } = await admin
    .from("stores")
    .select("id, owner_id")
    .limit(2000);

  const storeIds = (allStores ?? []).map((s) => s.id);
  const ownerByStore = new Map(
    (allStores ?? []).map((s) => [s.id, s.owner_id] as const),
  );
  const productCountByOwner = new Map<string, number>();
  const storeCountByOwner = new Map<string, number>();

  for (const store of allStores ?? []) {
    storeCountByOwner.set(
      store.owner_id,
      (storeCountByOwner.get(store.owner_id) ?? 0) + 1,
    );
  }

  if (storeIds.length > 0) {
    const { data: products } = await admin
      .from("products")
      .select("store_id")
      .in("store_id", storeIds.slice(0, 1500))
      .eq("is_active", true)
      .eq("is_deleted", false);

    for (const product of products ?? []) {
      const ownerId = ownerByStore.get(product.store_id);
      if (!ownerId) continue;
      productCountByOwner.set(
        ownerId,
        (productCountByOwner.get(ownerId) ?? 0) + 1,
      );
    }
  }

  const rankedOwners = [...productCountByOwner.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id);
  const rankedAuth = await resolveOwnerAuthMeta(rankedOwners);
  const { data: rankedProfiles } = await admin
    .from("profiles")
    .select("id, plan, subscription_period_ends_at")
    .in(
      "id",
      rankedOwners.length > 0
        ? rankedOwners
        : ["00000000-0000-0000-0000-000000000000"],
    );
  const rankedProfileById = new Map(
    (rankedProfiles ?? []).map((row) => [row.id, row] as const),
  );

  const usersNearProductLimit = rankedOwners.map((id) => {
    const profile = rankedProfileById.get(id);
    const auth = rankedAuth.get(id);
    return {
      email: auth?.email ?? null,
      plan: profile ? normalizeDbPlan(profile.plan) : "FREE",
      productCount: productCountByOwner.get(id) ?? 0,
      storeCount: storeCountByOwner.get(id) ?? 0,
      periodEndsAt: profile?.subscription_period_ends_at ?? null,
      accountRegisteredAt: auth?.registeredAt ?? null,
    };
  });

  const targetedLookups: AdminAssistantContext["targetedLookups"] = [];
  const searchTerms = extractSearchTerms(latestQuestion ?? "");

  for (const term of searchTerms) {
    const matches: Array<Record<string, string | number | boolean | null>> = [];

    const safeTerm = term.replace(/[%_,()]/g, "").slice(0, 60);
    if (safeTerm.length < 2) continue;

    const { data: storeHits } = await admin
      .from("stores")
      .select(
        "id, name, slug, is_active, rubro_tienda, owner_id, created_at",
      )
      .or(`name.ilike.%${safeTerm}%,slug.ilike.%${safeTerm}%`)
      .limit(8);

    if (storeHits && storeHits.length > 0) {
      const hitAuth = await resolveOwnerAuthMeta(
        storeHits.map((s) => s.owner_id),
      );
      const { data: hitProfiles } = await admin
        .from("profiles")
        .select("id, plan, subscription_status")
        .in(
          "id",
          storeHits.map((s) => s.owner_id),
        );

      const hitProfileById = new Map(
        (hitProfiles ?? []).map((row) => [row.id, row] as const),
      );

      for (const store of storeHits) {
        const profile = hitProfileById.get(store.owner_id);
        const auth = hitAuth.get(store.owner_id);
        matches.push({
          type: "store",
          name: store.name,
          slug: store.slug,
          isActive: Boolean(store.is_active),
          rubro: store.rubro_tienda,
          ownerEmail: auth?.email ?? null,
          ownerPlan: profile ? normalizeDbPlan(profile.plan) : null,
          ownerSubscriptionStatus: profile?.subscription_status ?? null,
          storeCreatedAt: store.created_at ?? null,
          accountRegisteredAt: auth?.registeredAt ?? store.created_at ?? null,
        });
      }
    }

    if (term.includes("@")) {
      // Búsqueda por correo: sample + altas recientes.
      const emailMatches = [...storesSample, ...recentRegistrations].filter(
        (store) => store.ownerEmail === term,
      );
      for (const store of emailMatches) {
        matches.push({
          type: "store_by_email",
          name: store.name,
          slug: store.slug,
          ownerEmail: store.ownerEmail,
          ownerPlan: store.ownerPlan,
          storeCreatedAt: store.storeCreatedAt,
          accountRegisteredAt: store.accountRegisteredAt,
        });
      }
    }

    if (matches.length > 0) {
      targetedLookups.push({ query: term, matches });
    }
  }

  // Si preguntan por “hoy/ayer/semana”, anclar un lookup temporal explícito.
  const questionLower = (latestQuestion ?? "").toLowerCase();
  const asksTemporal =
    /\b(hoy|ayer|esta semana|ultimos?\s+\d+\s+dias|últimos?\s+\d+\s+días|registrad)/i.test(
      questionLower,
    );
  if (asksTemporal && recentRegistrations.length > 0) {
    const today = formatLocalDate(new Date());
    const yesterday = shiftLocalDate(today, -1);
    const registeredToday = recentRegistrations.filter((store) => {
      const accountDay = store.accountRegisteredAt
        ? formatLocalDate(new Date(store.accountRegisteredAt))
        : null;
      const storeDay = store.storeCreatedAt
        ? formatLocalDate(new Date(store.storeCreatedAt))
        : null;
      return accountDay === today || storeDay === today;
    });
    const registeredYesterday = recentRegistrations.filter((store) => {
      const accountDay = store.accountRegisteredAt
        ? formatLocalDate(new Date(store.accountRegisteredAt))
        : null;
      const storeDay = store.storeCreatedAt
        ? formatLocalDate(new Date(store.storeCreatedAt))
        : null;
      return accountDay === yesterday || storeDay === yesterday;
    });

    targetedLookups.push({
      query: "temporal_registrations",
      matches: [
        {
          type: "temporal_summary",
          timezone: ADMIN_ASSISTANT_TIMEZONE,
          todayLocalDate: today,
          yesterdayLocalDate: yesterday,
          registeredTodayCount: registeredToday.length,
          registeredYesterdayCount: registeredYesterday.length,
          recentWindowDays: 14,
          recentCount: recentRegistrations.length,
        },
        ...registeredToday.slice(0, 40).map((store) => ({
          type: "registered_today",
          name: store.name,
          slug: store.slug,
          ownerEmail: store.ownerEmail,
          ownerPlan: store.ownerPlan,
          ownerSubscriptionStatus: store.ownerSubscriptionStatus,
          storeCreatedAt: store.storeCreatedAt,
          accountRegisteredAt: store.accountRegisteredAt,
        })),
        ...registeredYesterday.slice(0, 20).map((store) => ({
          type: "registered_yesterday",
          name: store.name,
          slug: store.slug,
          ownerEmail: store.ownerEmail,
          ownerPlan: store.ownerPlan,
          storeCreatedAt: store.storeCreatedAt,
          accountRegisteredAt: store.accountRegisteredAt,
        })),
      ],
    });
  }

  const todayLocalDate = formatLocalDate(new Date());

  return {
    generatedAt: new Date().toISOString(),
    calendar: {
      timezone: ADMIN_ASSISTANT_TIMEZONE,
      todayLocalDate,
      yesterdayLocalDate: shiftLocalDate(todayLocalDate, -1),
    },
    metrics: {
      totalUsers: metrics.totalUsers,
      totalStores: metrics.totalStores,
      byPlan: metrics.byPlan,
      storesByPlan: metrics.storesByPlan,
      verifiedPaymentsUsd: Number(metrics.verifiedPaymentsUsd.toFixed(2)),
      pendingPayments: metrics.pendingPayments,
    },
    plans: PLAN_SETTINGS_KEYS.map((key) => {
      const row = planSettings[key];
      return {
        planKey: row.planKey,
        displayName: row.displayName,
        monthlyUsd: row.monthlyUsd,
        annualUsd: row.annualUsd,
        productLimit: row.productLimit,
        userLimit: row.userLimit,
      };
    }),
    paymentStatusCounts,
    pendingPaymentsSample,
    storesSample,
    // Limitar payload del prompt; el lookup temporal ya trae el corte de “hoy”.
    recentRegistrations: recentRegistrations.slice(0, 100),
    usersNearProductLimit,
    targetedLookups,
    notes,
  };
}
