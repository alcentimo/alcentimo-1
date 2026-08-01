import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminPlanMetrics } from "@/lib/admin/get-admin-metrics";
import { normalizeDbPlan } from "@/lib/plans/plan-activation";
import { fetchPlanSettings } from "@/lib/plans/get-plan-settings";
import { PLAN_SETTINGS_KEYS } from "@/lib/plans/plan-settings";
import type { AdminAssistantContext } from "@/lib/ai/admin-assistant-types";

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

async function resolveOwnerEmails(
  ownerIds: string[],
): Promise<Map<string, string | null>> {
  const admin = createAdminClient();
  const emailById = new Map<string, string | null>();
  const unique = [...new Set(ownerIds)].slice(0, 120);

  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30);
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const { data } = await admin.auth.admin.getUserById(id);
          emailById.set(id, data.user?.email?.trim().toLowerCase() ?? null);
        } catch {
          emailById.set(id, null);
        }
      }),
    );
  }

  return emailById;
}

/**
 * Contexto operativo del SaaS para el asistente IA gerencial (service role).
 * Incluye métricas, planes, pagos, muestra de tiendas y búsquedas dirigidas
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
  const pendingEmails = await resolveOwnerEmails(pendingOwnerIds);

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
    userEmail: pendingEmails.get(payment.user_id) ?? null,
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
    .limit(80);

  if (storesError) {
    notes.push(`Tiendas: ${storesError.message}`);
  }

  const ownerIds = (stores ?? []).map((store) => store.owner_id);
  const ownerEmails = await resolveOwnerEmails(ownerIds);

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
    return {
      name: store.name,
      slug: store.slug,
      isActive: Boolean(store.is_active),
      rubro: store.rubro_tienda,
      ownerEmail: ownerEmails.get(store.owner_id) ?? null,
      ownerPlan: profile ? normalizeDbPlan(profile.plan) : null,
      ownerSubscriptionStatus: profile?.subscription_status ?? null,
    };
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
  const rankedEmails = await resolveOwnerEmails(rankedOwners);
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
    return {
      email: rankedEmails.get(id) ?? null,
      plan: profile ? normalizeDbPlan(profile.plan) : "FREE",
      productCount: productCountByOwner.get(id) ?? 0,
      storeCount: storeCountByOwner.get(id) ?? 0,
      periodEndsAt: profile?.subscription_period_ends_at ?? null,
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
      .select("id, name, slug, is_active, rubro_tienda, owner_id")
      .or(`name.ilike.%${safeTerm}%,slug.ilike.%${safeTerm}%`)
      .limit(8);

    if (storeHits && storeHits.length > 0) {
      const hitEmails = await resolveOwnerEmails(
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
        matches.push({
          type: "store",
          name: store.name,
          slug: store.slug,
          isActive: Boolean(store.is_active),
          rubro: store.rubro_tienda,
          ownerEmail: hitEmails.get(store.owner_id) ?? null,
          ownerPlan: profile ? normalizeDbPlan(profile.plan) : null,
          ownerSubscriptionStatus: profile?.subscription_status ?? null,
        });
      }
    }

    if (term.includes("@")) {
      // Búsqueda por correo: recorrer perfiles recientes + auth (limitado).
      const emailMatches = storesSample.filter(
        (store) => store.ownerEmail === term,
      );
      for (const store of emailMatches) {
        matches.push({
          type: "store_by_email",
          name: store.name,
          slug: store.slug,
          ownerEmail: store.ownerEmail,
          ownerPlan: store.ownerPlan,
        });
      }
    }

    if (matches.length > 0) {
      targetedLookups.push({ query: term, matches });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
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
    usersNearProductLimit,
    targetedLookups,
    notes,
  };
}
