"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  resolveSupplierAccess,
  resolveSupplierAuthEmail,
} from "@/lib/supplier/access";
import {
  mapPayoutRow,
  isMissingPayoutProofColumnError,
  SUPPLIER_PAYOUT_SELECT,
  SUPPLIER_PAYOUT_SELECT_LEGACY,
} from "@/lib/dropship/settlement-shared";
import { getSupplierCreditedBalanceUsd } from "@/lib/dropship/settlement-ledger";
import type { SupplierPayoutObligationView } from "@/lib/dropship/settlement-types";

export async function listMySupplierPayoutObligations(): Promise<{
  error?: string;
  payouts?: SupplierPayoutObligationView[];
  creditedBalanceUsd?: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión." };

  const access = await resolveSupplierAccess({
    email: resolveSupplierAuthEmail(user),
    userId: user.id,
    user,
  });
  if (!access.ok) {
    return { error: "No tienes acceso al panel de proveedores." };
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;
  let { data, error } = await client
    .from("supplier_payout_obligations")
    .select(SUPPLIER_PAYOUT_SELECT)
    .eq("supplier_user_id", user.id)
    .order("ship_on", { ascending: false })
    .limit(40);

  if (error && isMissingPayoutProofColumnError(error.message)) {
    const fallback = await client
      .from("supplier_payout_obligations")
      .select(SUPPLIER_PAYOUT_SELECT_LEGACY)
      .eq("supplier_user_id", user.id)
      .order("ship_on", { ascending: false })
      .limit(40);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return { error: error.message };
  const creditedBalanceUsd = await getSupplierCreditedBalanceUsd(user.id);
  return {
    payouts: ((data as Record<string, unknown>[] | null) ?? []).map(mapPayoutRow),
    creditedBalanceUsd,
  };
}
