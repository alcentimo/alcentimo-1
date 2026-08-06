import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ORDER_PAYMENT_PROOF_RETENTION_DAYS } from "@/lib/orders/payment-proof-policy";
import { deleteOrderPaymentProofFile } from "@/lib/orders/storage";

const BATCH_SIZE = 50;

export interface PurgeExpiredPaymentProofsResult {
  scanned: number;
  deleted: number;
  cleared: number;
  errors: number;
}

/**
 * Elimina del Storage los comprobantes de pedidos con más de 60 días
 * y limpia `payment_proof_url` (el resto del pedido se conserva).
 */
export async function purgeExpiredOrderPaymentProofs(
  admin: SupabaseClient,
): Promise<PurgeExpiredPaymentProofsResult> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - ORDER_PAYMENT_PROOF_RETENTION_DAYS);
  const cutoffIso = cutoff.toISOString();

  let scanned = 0;
  let deleted = 0;
  let cleared = 0;
  let errors = 0;
  let from = 0;

  for (;;) {
    const { data, error } = await admin
      .from("orders")
      .select("id, store_id, payment_proof_url")
      .not("payment_proof_url", "is", null)
      .lt("created_at", cutoffIso)
      .order("created_at", { ascending: true })
      .range(from, from + BATCH_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const rows = data ?? [];
    if (rows.length === 0) break;

    scanned += rows.length;

    for (const row of rows) {
      const orderId = row.id as string;
      const storeId = row.store_id as string;
      const proofUrl = row.payment_proof_url as string | null;

      const removal = await deleteOrderPaymentProofFile(
        storeId,
        orderId,
        proofUrl,
      );

      if (!removal.ok) {
        errors += 1;
        continue;
      }

      deleted += 1;

      const { error: updateError } = await admin
        .from("orders")
        .update({ payment_proof_url: null })
        .eq("id", orderId)
        .eq("store_id", storeId);

      if (updateError) {
        errors += 1;
      } else {
        cleared += 1;
      }
    }

    if (rows.length < BATCH_SIZE) break;
    from += BATCH_SIZE;
  }

  return { scanned, deleted, cleared, errors };
}
