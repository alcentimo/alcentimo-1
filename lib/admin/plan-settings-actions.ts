"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import {
  DEFAULT_PLAN_SETTINGS,
  type PlanSettingRow,
  type PlanSettingsKey,
  type PlanSettingsMap,
} from "@/lib/plans/plan-settings";

export type UpdatePlanSettingsResult = {
  error?: string;
  success?: boolean;
  settings?: PlanSettingsMap;
};

const PLAN_KEYS: PlanSettingsKey[] = ["FREE", "PRO", "BUSINESS"];

function parseMoneyField(
  value: FormDataEntryValue | null,
  label: string,
  { allowZero = true }: { allowZero?: boolean } = {},
): number | { error: string } {
  if (value == null || typeof value !== "string" || !value.trim()) {
    return { error: `${label} es obligatorio.` };
  }
  const n = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(n)) {
    return { error: `${label} no es un número válido.` };
  }
  if (n < 0 || (!allowZero && n === 0)) {
    return { error: `${label} debe ser mayor${allowZero ? " o igual" : ""} a 0.` };
  }
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function parseOptionalLimit(
  value: FormDataEntryValue | null,
  label: string,
): number | null | { error: string } {
  if (value == null || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "ilimitado") return null;
  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    return {
      error: `${label} debe ser un entero positivo, o vacío para ilimitado.`,
    };
  }
  if (n > 1_000_000) {
    return { error: `${label} es demasiado alto.` };
  }
  return n;
}

function readPlanFromForm(
  formData: FormData,
  key: PlanSettingsKey,
): PlanSettingRow | { error: string } {
  const prefix = key.toLowerCase();
  const defaults = DEFAULT_PLAN_SETTINGS[key];

  const displayRaw = formData.get(`${prefix}_displayName`);
  const displayName =
    typeof displayRaw === "string" && displayRaw.trim()
      ? displayRaw.trim().slice(0, 60)
      : defaults.displayName;

  const monthly = parseMoneyField(
    formData.get(`${prefix}_monthlyUsd`),
    `${displayName}: precio mensual`,
    { allowZero: key === "FREE" },
  );
  if (typeof monthly === "object") return monthly;

  let annualUsd: number | null = null;
  if (key !== "FREE") {
    const annual = parseMoneyField(
      formData.get(`${prefix}_annualUsd`),
      `${displayName}: precio anual`,
      { allowZero: false },
    );
    if (typeof annual === "object") return annual;
    annualUsd = annual;
  }

  const productLimit = parseOptionalLimit(
    formData.get(`${prefix}_productLimit`),
    `${displayName}: límite de productos`,
  );
  if (productLimit && typeof productLimit === "object" && "error" in productLimit) {
    return productLimit;
  }

  const userLimit = parseOptionalLimit(
    formData.get(`${prefix}_userLimit`),
    `${displayName}: límite de usuarios`,
  );
  if (userLimit && typeof userLimit === "object" && "error" in userLimit) {
    return userLimit;
  }

  if (key === "FREE" && monthly > 0) {
    return { error: "El plan Gratis debe tener precio mensual 0." };
  }

  return {
    planKey: key,
    displayName,
    monthlyUsd: monthly,
    annualUsd,
    productLimit: (productLimit as number | null) ?? null,
    userLimit: (userLimit as number | null) ?? null,
  };
}

export async function updatePlanSettings(
  formData: FormData,
): Promise<UpdatePlanSettingsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { error: "No tienes permiso para editar la configuración de planes." };
  }

  const settings: PlanSettingsMap = {
    FREE: { ...DEFAULT_PLAN_SETTINGS.FREE },
    PRO: { ...DEFAULT_PLAN_SETTINGS.PRO },
    BUSINESS: { ...DEFAULT_PLAN_SETTINGS.BUSINESS },
  };

  for (const key of PLAN_KEYS) {
    const row = readPlanFromForm(formData, key);
    if ("error" in row) return row;
    settings[key] = row;
  }

  if (
    settings.PRO.productLimit != null &&
    settings.FREE.productLimit != null &&
    settings.PRO.productLimit <= settings.FREE.productLimit
  ) {
    return {
      error: "El límite de productos de Pro debe ser mayor que el de Gratis.",
    };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  for (const key of PLAN_KEYS) {
    const row = settings[key];
    const { error } = await admin.from("plan_settings").upsert(
      {
        plan_key: key,
        display_name: row.displayName,
        monthly_usd: row.monthlyUsd,
        annual_usd: row.annualUsd,
        product_limit: row.productLimit,
        user_limit: row.userLimit,
        updated_at: now,
        updated_by: user.id,
      },
      { onConflict: "plan_key" },
    );
    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/activar");
  revalidatePath("/dashboard/planes");
  revalidatePath("/dashboard/upgrade");
  revalidatePath("/dashboard/pago");
  revalidatePath("/dashboard/catalogo");
  revalidatePath("/");

  return { success: true, settings };
}
