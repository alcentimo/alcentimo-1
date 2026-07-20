"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import type {
  SubscriptionCampaign,
  SubscriptionCoupon,
  SubscriptionCouponRewardType,
} from "@/lib/database.types";
import { normalizePromoCode } from "@/lib/admin/growth-discount";

export type GrowthActionResult = {
  error?: string;
  success?: boolean;
  coupon?: SubscriptionCoupon;
  campaign?: SubscriptionCampaign;
};

async function requireSupportAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSupportAdmin(resolveAuthEmail(user))) {
    return { ok: false as const, error: "No tienes permiso de administrador." };
  }
  return { ok: true as const, user };
}

function revalidate() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/activar");
  revalidatePath("/dashboard/planes");
}

export async function listSubscriptionCoupons(): Promise<SubscriptionCoupon[]> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) throw new Error(auth.error);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscription_coupons")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as SubscriptionCoupon[];
}

export async function createSubscriptionCoupon(input: {
  code: string;
  name: string;
  rewardType: SubscriptionCouponRewardType;
  discountPercent?: number | null;
  discountUsd?: number | null;
  grantProDays?: number | null;
  maxRedemptions?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
}): Promise<GrowthActionResult> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const code = normalizePromoCode(input.code);
  const name = input.name.trim();
  if (!code || code.length < 3) {
    return { error: "El código debe tener al menos 3 caracteres." };
  }
  if (!name) return { error: "El nombre es obligatorio." };

  const row: Record<string, unknown> = {
    code,
    name,
    reward_type: input.rewardType,
    discount_percent: null,
    discount_usd: null,
    grant_pro_days: null,
    max_redemptions: input.maxRedemptions ?? null,
    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
    is_active: true,
    created_by: auth.user.id,
    updated_at: new Date().toISOString(),
  };

  if (input.rewardType === "percent_discount") {
    const pct = Number(input.discountPercent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      return { error: "Porcentaje inválido (1–100)." };
    }
    row.discount_percent = pct;
  } else if (input.rewardType === "fixed_discount") {
    const usd = Number(input.discountUsd);
    if (!Number.isFinite(usd) || usd <= 0) {
      return { error: "Monto fijo inválido." };
    }
    row.discount_usd = usd;
  } else {
    const days = Number(input.grantProDays);
    if (!Number.isFinite(days) || days <= 0) {
      return { error: "Días Pro inválidos." };
    }
    row.grant_pro_days = Math.trunc(days);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscription_coupons")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { error: "Ese código ya existe." };
    }
    return { error: error.message };
  }

  revalidate();
  return { success: true, coupon: data as SubscriptionCoupon };
}

export async function toggleSubscriptionCoupon(
  couponId: string,
  isActive: boolean,
): Promise<GrowthActionResult> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("subscription_coupons")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", couponId);

  if (error) return { error: error.message };
  revalidate();
  return { success: true };
}

export async function listSubscriptionCampaigns(): Promise<
  SubscriptionCampaign[]
> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) throw new Error(auth.error);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscription_campaigns")
    .select("*")
    .order("starts_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as SubscriptionCampaign[];
}

export async function createSubscriptionCampaign(input: {
  name: string;
  discountPercent?: number | null;
  discountUsd?: number | null;
  startsAt: string;
  endsAt: string;
  appliesToPlans?: string[];
}): Promise<GrowthActionResult> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const name = input.name.trim();
  if (!name) return { error: "El nombre es obligatorio." };
  if (!input.startsAt || !input.endsAt) {
    return { error: "Define inicio y fin de la campaña." };
  }
  if (new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
    return { error: "La fecha de fin debe ser posterior al inicio." };
  }

  const percent =
    input.discountPercent != null && input.discountPercent !== ("" as never)
      ? Number(input.discountPercent)
      : null;
  const fixed =
    input.discountUsd != null && input.discountUsd !== ("" as never)
      ? Number(input.discountUsd)
      : null;

  if ((percent == null || !Number.isFinite(percent)) && (fixed == null || !Number.isFinite(fixed))) {
    return { error: "Indica un descuento porcentual o un monto fijo." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("subscription_campaigns")
    .insert({
      name,
      discount_percent:
        percent != null && Number.isFinite(percent) && percent > 0
          ? percent
          : null,
      discount_usd:
        fixed != null && Number.isFinite(fixed) && fixed > 0 ? fixed : null,
      starts_at: new Date(input.startsAt).toISOString(),
      ends_at: new Date(input.endsAt).toISOString(),
      is_active: true,
      applies_to_plans: input.appliesToPlans?.length
        ? input.appliesToPlans
        : ["PRO", "BUSINESS"],
      created_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  revalidate();
  return { success: true, campaign: data as SubscriptionCampaign };
}

export async function toggleSubscriptionCampaign(
  campaignId: string,
  isActive: boolean,
): Promise<GrowthActionResult> {
  const auth = await requireSupportAdmin();
  if (!auth.ok) return { error: auth.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("subscription_campaigns")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  if (error) return { error: error.message };
  revalidate();
  return { success: true };
}
