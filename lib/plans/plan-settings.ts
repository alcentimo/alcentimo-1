import type { ProfilePlanDb } from "@/lib/database.types";
import {
  CUSTOM_DOMAIN_FEATURE,
  FREE_SUBDOMAIN_FEATURE,
  PAID_PLAN_CTA,
  type BillingPeriod,
  type PlanPricingTier,
} from "@/src/config/plan-pricing-ui";
import type { PlanId } from "@/src/config/plans";
import { formatProductLimit } from "@/src/config/plans";

export type PlanSettingsKey = "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";

export interface PlanSettingRow {
  planKey: PlanSettingsKey;
  displayName: string;
  monthlyUsd: number;
  annualUsd: number | null;
  productLimit: number | null;
  userLimit: number | null;
  /** Sucursales incluidas en el plan base. */
  includedLocations: number;
  /** Precio mensual por sede adicional (add-on). */
  extraLocationMonthlyUsd: number;
}

export type PlanSettingsMap = Record<PlanSettingsKey, PlanSettingRow>;

export type PlanChargeTable = Partial<
  Record<ProfilePlanDb, { monthlyUsd: number; annualUsd: number | null }>
>;

export const PLAN_SETTINGS_KEYS: PlanSettingsKey[] = [
  "FREE",
  "PRO",
  "BUSINESS",
  "ENTERPRISE",
];

/** Defaults alineados con migraciones 050 / 063. */
export const DEFAULT_PLAN_SETTINGS: PlanSettingsMap = {
  FREE: {
    planKey: "FREE",
    displayName: "Gratis",
    monthlyUsd: 0,
    annualUsd: null,
    productLimit: 10,
    userLimit: null,
    includedLocations: 1,
    extraLocationMonthlyUsd: 0,
  },
  PRO: {
    planKey: "PRO",
    displayName: "Pro",
    monthlyUsd: 8,
    annualUsd: 75,
    productLimit: 250,
    userLimit: null,
    includedLocations: 1,
    extraLocationMonthlyUsd: 0,
  },
  BUSINESS: {
    planKey: "BUSINESS",
    displayName: "Business",
    monthlyUsd: 15,
    annualUsd: 144,
    productLimit: null,
    userLimit: null,
    includedLocations: 1,
    extraLocationMonthlyUsd: 0,
  },
  ENTERPRISE: {
    planKey: "ENTERPRISE",
    displayName: "Enterprise",
    monthlyUsd: 29,
    annualUsd: 278,
    productLimit: null,
    userLimit: null,
    includedLocations: 3,
    extraLocationMonthlyUsd: 6,
  },
};

const TIER_STATIC: Record<
  PlanId,
  Pick<PlanPricingTier, "tagline" | "features" | "cta" | "recommended" | "addonNote">
> = {
  free: {
    tagline: "Ideal para empezar",
    features: [
      FREE_SUBDOMAIN_FEATURE,
      "Precios USD y Bs automáticos",
      "Cupones, variantes y alertas de stock",
    ],
    cta: "Continuar gratis",
  },
  starter: {
    tagline: "Para negocios en crecimiento",
    features: [
      "Todo lo del plan Gratis",
      CUSTOM_DOMAIN_FEATURE,
      "Más capacidad de catálogo",
      "Soporte por email",
    ],
    cta: PAID_PLAN_CTA,
    recommended: true,
  },
  growth: {
    tagline: "Para negocios en crecimiento",
    features: ["Más capacidad de catálogo"],
    cta: PAID_PLAN_CTA,
  },
  premium: {
    tagline: "Para marcas establecidas",
    features: [
      "Todo lo del plan Pro",
      CUSTOM_DOMAIN_FEATURE,
      "Usuarios y roles de equipo",
      "Soporte dedicado",
    ],
    cta: PAID_PLAN_CTA,
  },
  enterprise: {
    tagline: "Multi-sucursal y operaciones avanzadas",
    features: [
      "Todo lo del plan Business",
      CUSTOM_DOMAIN_FEATURE,
      "Hasta 3 sucursales incluidas",
      "Selector de sede y retiro en tienda",
      "Stock independiente por sucursal",
    ],
    addonNote: "Sedes adicionales: +$6 USD/mes por cada sede extra",
    cta: PAID_PLAN_CTA,
  },
};

export function planIdToSettingsKey(planId: PlanId): PlanSettingsKey {
  if (planId === "free") return "FREE";
  if (planId === "premium") return "BUSINESS";
  if (planId === "enterprise") return "ENTERPRISE";
  return "PRO";
}

export function settingsKeyToPlanId(key: PlanSettingsKey): PlanId {
  if (key === "FREE") return "free";
  if (key === "BUSINESS") return "premium";
  if (key === "ENTERPRISE") return "enterprise";
  return "starter";
}

export function getProductLimitFromSettings(
  planId: PlanId,
  settings: PlanSettingsMap = DEFAULT_PLAN_SETTINGS,
): number | null {
  return settings[planIdToSettingsKey(planId)].productLimit;
}

export function buildChargeTableFromSettings(
  settings: PlanSettingsMap = DEFAULT_PLAN_SETTINGS,
): PlanChargeTable {
  return {
    FREE: {
      monthlyUsd: settings.FREE.monthlyUsd,
      annualUsd: settings.FREE.annualUsd,
    },
    PRO: {
      monthlyUsd: settings.PRO.monthlyUsd,
      annualUsd: settings.PRO.annualUsd,
    },
    BUSINESS: {
      monthlyUsd: settings.BUSINESS.monthlyUsd,
      annualUsd: settings.BUSINESS.annualUsd,
    },
    ENTERPRISE: {
      monthlyUsd: settings.ENTERPRISE.monthlyUsd,
      annualUsd: settings.ENTERPRISE.annualUsd,
    },
  };
}

export function buildChargeTableFromTiers(
  tiers: PlanPricingTier[],
): PlanChargeTable {
  const table: PlanChargeTable = {
    FREE: { monthlyUsd: 0, annualUsd: null },
  };
  for (const tier of tiers) {
    const key = planIdToSettingsKey(tier.planId);
    table[key] = {
      monthlyUsd: tier.monthlyUsd,
      annualUsd: tier.annualUsd,
    };
  }
  return table;
}

function productLimitLabel(limit: number | null): string {
  if (limit == null) return "Productos ilimitados";
  return `Hasta ${formatProductLimit(limit)} productos`;
}

function formatAddonNote(row: PlanSettingRow): string | null {
  if (row.planKey !== "ENTERPRISE") return null;
  const price = row.extraLocationMonthlyUsd;
  if (price <= 0) return null;
  const formatted = Number.isInteger(price) ? String(price) : price.toFixed(2);
  return `Sedes adicionales: +$${formatted} USD/mes por cada sede extra`;
}

/** Construye las tarjetas de precios a partir de plan_settings. */
export function buildPlanPricingTiers(
  settings: PlanSettingsMap = DEFAULT_PLAN_SETTINGS,
): PlanPricingTier[] {
  const order: Array<{ planId: PlanId; key: PlanSettingsKey }> = [
    { planId: "free", key: "FREE" },
    { planId: "starter", key: "PRO" },
    { planId: "premium", key: "BUSINESS" },
    { planId: "enterprise", key: "ENTERPRISE" },
  ];

  return order.map(({ planId, key }) => {
    const row = settings[key];
    const staticMeta = TIER_STATIC[planId];
    const features = [...staticMeta.features];

    if (row.userLimit != null && planId === "premium") {
      features.splice(1, 0, `Hasta ${row.userLimit} usuarios del equipo`);
    }

    if (planId === "enterprise" && row.includedLocations > 0) {
      const idx = features.findIndex((f) => f.includes("sucursales"));
      const label = `Hasta ${row.includedLocations} sucursales incluidas`;
      if (idx >= 0) features[idx] = label;
      else features.splice(1, 0, label);
    }

    return {
      planId,
      displayName: row.displayName,
      tagline: staticMeta.tagline,
      monthlyUsd: row.monthlyUsd,
      annualUsd: row.annualUsd,
      productLimitLabel: productLimitLabel(row.productLimit),
      recommended: staticMeta.recommended,
      features,
      addonNote: formatAddonNote(row) ?? staticMeta.addonNote ?? null,
      cta: staticMeta.cta,
    };
  });
}

export function getChargeUsdFromTable(
  plan: ProfilePlanDb,
  billing: BillingPeriod,
  charges: PlanChargeTable,
): number {
  const entry = charges[plan];
  if (!entry || entry.monthlyUsd <= 0) return 0;
  if (billing === "monthly") return entry.monthlyUsd;
  return entry.annualUsd ?? entry.monthlyUsd * 12;
}

/** Helpers para parsear filas crudas de Supabase (servidor). */
export function parsePlanSettingsRows(
  data: Array<{
    plan_key?: string | null;
    display_name?: string | null;
    monthly_usd?: number | string | null;
    annual_usd?: number | string | null;
    product_limit?: number | string | null;
    user_limit?: number | string | null;
    included_locations?: number | string | null;
    extra_location_monthly_usd?: number | string | null;
  }>,
): PlanSettingsMap {
  const result: PlanSettingsMap = {
    FREE: { ...DEFAULT_PLAN_SETTINGS.FREE },
    PRO: { ...DEFAULT_PLAN_SETTINGS.PRO },
    BUSINESS: { ...DEFAULT_PLAN_SETTINGS.BUSINESS },
    ENTERPRISE: { ...DEFAULT_PLAN_SETTINGS.ENTERPRISE },
  };

  for (const row of data) {
    const key = String(row.plan_key ?? "").toUpperCase() as PlanSettingsKey;
    if (!PLAN_SETTINGS_KEYS.includes(key)) continue;
    const defaults = DEFAULT_PLAN_SETTINGS[key];
    result[key] = {
      planKey: key,
      displayName: row.display_name?.trim() || defaults.displayName,
      monthlyUsd: parseMoney(row.monthly_usd, defaults.monthlyUsd),
      annualUsd:
        row.annual_usd == null
          ? null
          : parseMoney(row.annual_usd, defaults.annualUsd ?? 0),
      productLimit:
        row.product_limit === null || row.product_limit === undefined
          ? row.product_limit === null
            ? null
            : defaults.productLimit
          : parseOptionalInt(row.product_limit),
      userLimit: parseOptionalInt(row.user_limit),
      includedLocations:
        parseOptionalInt(row.included_locations) ?? defaults.includedLocations,
      extraLocationMonthlyUsd: parseMoney(
        row.extra_location_monthly_usd,
        defaults.extraLocationMonthlyUsd,
      ),
    };
  }

  return result;
}

function parseOptionalInt(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function parseMoney(value: unknown, fallback: number): number {
  if (value == null) return fallback;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
