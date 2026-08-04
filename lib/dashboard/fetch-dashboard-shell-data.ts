"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { getUserStore } from "@/lib/stores";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { isStoreOwner } from "@/lib/stores/owner-access";
import {
  normalizeDbPlan,
  resolveSubscriptionStatus,
  type SubscriptionStatus,
} from "@/lib/plans/plan-activation";
import {
  getDisplayPlanForProfile,
  resolveProTrialStatus,
} from "@/lib/plans/trial";
import { getStoreOwnerPlanProfile } from "@/lib/plans/product-limit";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { getStoreMemberRole } from "@/lib/team/access";
import { withTimeoutFallback } from "@/lib/async/with-timeout-fallback";
import { buildAccountSnapshot } from "@/lib/account/get-account-snapshot";
import type { AccountSnapshot } from "@/lib/account/types";
import type { InterfacePreferencesSettings } from "@/lib/store-settings/types";
import type { DashboardStoreRole } from "@/lib/team/permissions";
import type { Profile } from "@/lib/database.types";
import type { UserWithPlan } from "@/lib/auth/get-user-profile";
import { getStoreProductCount } from "@/lib/plans/product-limit";
import {
  getOnboardingSetupStatus,
  type ProTrialSetupPick,
} from "@/lib/onboarding/setup-status";
import { scheduleStoreSubdomainProvision } from "@/lib/domains/provision-store-subdomain";

const SHELL_QUERY_TIMEOUT_MS = 8_000;

export type DashboardShellData =
  | {
      ok: true;
      storeName: string | null;
      storeCountry: string | null;
      userEmail: string | null;
      planName: string | null;
      subscriptionStatus: SubscriptionStatus;
      trialActive: boolean;
      trialEligible: boolean;
      trialPhase: "none" | "active" | "grace" | "review" | "closed";
      trialEndsAt: string | null;
      trialGraceEndsAt: string | null;
      proTrialSetup: ProTrialSetupPick | null;
      /** Productos activos (para contador N/10 en Primeros pasos). */
      proTrialProductCount: number;
      exchangeRate: number | null;
      exchangeRateUpdatedAt: string | null;
      isSupportAdmin: boolean;
      isStoreOwner: boolean;
      storeRole: DashboardStoreRole | null;
      canUpgradeToBusiness: boolean;
      interfacePreferences: InterfacePreferencesSettings;
      accountSnapshot: AccountSnapshot;
    }
  | { ok: false; error: string };

function toOwnerProfile(
  ownerPlan: NonNullable<Awaited<ReturnType<typeof getStoreOwnerPlanProfile>>>,
): Profile {
  return {
    id: ownerPlan.ownerId,
    plan: ownerPlan.plan ?? "FREE",
    subscription_status: ownerPlan.subscription_status,
    pro_trial_started_at: ownerPlan.pro_trial_started_at,
    pro_trial_ends_at: ownerPlan.pro_trial_ends_at,
    pro_trial_closed_at: ownerPlan.pro_trial_closed_at ?? null,
    billing_period: ownerPlan.billing_period,
    subscription_period_started_at: ownerPlan.subscription_period_started_at,
    subscription_period_ends_at: ownerPlan.subscription_period_ends_at,
    extra_locations_authorized: ownerPlan.extra_locations_authorized ?? 0,
  };
}

function withOrganizationPlan(
  authUser: UserWithPlan,
  ownerProfile: Profile | null,
): UserWithPlan {
  const profile = ownerProfile ?? authUser.profile;
  const displayPlan = getDisplayPlanForProfile(profile);
  return {
    ...authUser,
    profile,
    planId: displayPlan.planId,
    plan: { ...displayPlan.plan, name: displayPlan.planName },
    rawPlan: profile?.plan ?? authUser.rawPlan ?? "FREE",
  };
}

/** Datos del chrome del dashboard; se llama desde el cliente (useEffect). */
export async function fetchDashboardShellData(): Promise<DashboardShellData> {
  try {
    const supabase = await createClient();
    const auth = await requireAuthUser(supabase);
    if (!auth.ok) {
      return { ok: false, error: auth.error };
    }

    const store = await getUserStore(supabase, auth.authUser.id);
    if (store?.id && store.slug) {
      // Idempotente: asegura CNAME + dominio Vercel (evita ERR_CONNECTION_CLOSED).
      scheduleStoreSubdomainProvision({ storeId: store.id, slug: store.slug });
    }
    const storeRole = store
      ? await getStoreMemberRole(supabase, store.id, auth.authUser.id)
      : null;

    const ownerPlan = store
      ? await withTimeoutFallback(
          getStoreOwnerPlanProfile(store.id),
          SHELL_QUERY_TIMEOUT_MS,
          null,
          "shell:getStoreOwnerPlanProfile",
        )
      : null;

    const organizationProfile = ownerPlan ? toOwnerProfile(ownerPlan) : null;
    const authUser = withOrganizationPlan(auth.authUser, organizationProfile);
    const displayPlan = getDisplayPlanForProfile(authUser.profile);
    const trial = resolveProTrialStatus(authUser.profile, displayPlan.planId);

    const [exchangeRateRow, settingsConfig, productCount] = await Promise.all([
      withTimeoutFallback(
        getCurrentExchangeRate(),
        SHELL_QUERY_TIMEOUT_MS,
        null,
        "shell:getCurrentExchangeRate",
      ),
      store
        ? withTimeoutFallback(
            getStoreSettingsConfig(store.id),
            SHELL_QUERY_TIMEOUT_MS,
            defaultStoreSettingsConfig(),
            "shell:getStoreSettingsConfig",
          )
        : Promise.resolve(defaultStoreSettingsConfig()),
      store
        ? withTimeoutFallback(
            getStoreProductCount(store.id),
            SHELL_QUERY_TIMEOUT_MS,
            0,
            "shell:getStoreProductCount",
          )
        : Promise.resolve(0),
    ]);

    const exchangeRate = exchangeRateRow?.rate ?? null;
    const exchangeRateUpdatedAt = exchangeRateRow?.created_at ?? null;
    const ownerFlag = store ? isStoreOwner(store, authUser.id) : false;
    const setupStatus = store
      ? getOnboardingSetupStatus(productCount, settingsConfig, store.slug)
      : null;
    const proTrialSetup: ProTrialSetupPick | null = setupStatus
      ? {
          hasMinProductsForProTrial: setupStatus.hasMinProductsForProTrial,
          hasPaymentsConfigured: setupStatus.hasPaymentsConfigured,
          hasShippingConfigured: setupStatus.hasShippingConfigured,
        }
      : null;

    return {
      ok: true,
      storeName: store?.name ?? null,
      storeCountry: store?.country ?? null,
      userEmail: authUser.email ?? null,
      planName: displayPlan.planName,
      subscriptionStatus: resolveSubscriptionStatus(
        authUser.profile?.subscription_status,
      ),
      trialActive: trial.benefitsActive,
      trialEligible: trial.eligible,
      trialPhase: trial.phase,
      trialEndsAt: trial.endsAt,
      trialGraceEndsAt: trial.graceEndsAt,
      proTrialSetup,
      proTrialProductCount: store ? productCount : 0,
      exchangeRate,
      exchangeRateUpdatedAt,
      isSupportAdmin: isSupportAdmin(
        resolveAuthEmail({ email: authUser.email, user_metadata: {} }),
      ),
      isStoreOwner: ownerFlag,
      storeRole,
      canUpgradeToBusiness:
        normalizeDbPlan(authUser.profile?.plan ?? authUser.rawPlan) === "PRO",
      interfacePreferences: settingsConfig.interfacePreferences,
      accountSnapshot: buildAccountSnapshot({
        authUser,
        store,
        storeRole,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar el panel.",
    };
  }
}
