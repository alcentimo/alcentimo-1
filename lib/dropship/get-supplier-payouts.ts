"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  resolveSupplierAccess,
  resolveSupplierAuthEmail,
} from "@/lib/supplier/access";
import { mapPayoutRow } from "@/lib/dropship/settlement-shared";
import type { SupplierPayoutObligationView } from "@/lib/dropship/settlement-types";

export async function listMySupplierPayoutObligations(): Promise<{
  error?: string;
  payouts?: SupplierPayoutObligationView[];
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
  const { data, error } = await (admin as any)
    .from("supplier_payout_obligations")
    .select(
      "id, settlement_id, supplier_user_id, business_date, ship_on, amount_usd, order_count, line_count, status",
    )
    .eq("supplier_user_id", user.id)
    .order("ship_on", { ascending: false })
    .limit(40);

  if (error) return { error: error.message };
  return {
    payouts: ((data as Record<string, unknown>[] | null) ?? []).map(mapPayoutRow),
  };
}
