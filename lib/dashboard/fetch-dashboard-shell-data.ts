"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthUser } from "@/lib/auth/require-dashboard-auth";
import { getUserStore } from "@/lib/stores";
import { getCurrentExchangeRate } from "@/lib/catalog";
import { isSupportAdmin, resolveAuthEmail } from "@/lib/support/is-support-admin";
import { isStoreOwner } from "@/lib/stores/owner-access";
import { normalizeDbPlan } from "@/lib/plans/plan-activation";
import { getStoreSettingsConfig } from "@/lib/store-settings/get-store-settings";
import { defaultStoreSettingsConfig } from "@/lib/store-settings/defaults";
import { getStoreMemberRole } from "@/lib/team/access";
import { withTimeoutFallback } from "@/lib/async/with-timeout-fallback";
import { buildAccountSnapshot } from "@/lib/account/get-account-snapshot";
import type { AccountSnapshot } from "@/lib/account/types";
import type { InterfacePreferencesSettings } from "@/lib/store-settings/types";
import type { DashboardStoreRole } from "@/lib/team/permissions";

const SHELL_QUERY_TIMEOUT_MS = 8_000;

export type DashboardShellData =
  | {
      ok: true;
      storeName: string | null;
      storeCountry: string | null;
      userEmail: string | null;
      planName: string | null;
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

/** Datos del chrome del dashboard; se llama desde el cliente (useEffect). */
export async function fetchDashboardShellData(): Promise<DashboardShellData> {
  try {
    const supabase = await createClient();
    const auth = await requireAuthUser(supabase);
    if (!auth.ok) {
      return { ok: false, error: auth.error };
    }

    const { authUser } = auth;
    const store = await getUserStore(supabase, authUser.id);
    const storeRole = store
      ? await getStoreMemberRole(supabase, store.id, authUser.id)
      : null;

    const [exchangeRateRow, settingsConfig] = await Promise.all([
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
    ]);

    const exchangeRate = exchangeRateRow?.rate ?? null;
    const exchangeRateUpdatedAt = exchangeRateRow?.created_at ?? null;
    const ownerFlag = store ? isStoreOwner(store, authUser.id) : false;

    return {
      ok: true,
      storeName: store?.name ?? null,
      storeCountry: store?.country ?? null,
      userEmail: authUser.email ?? null,
      planName: authUser.plan.name,
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
