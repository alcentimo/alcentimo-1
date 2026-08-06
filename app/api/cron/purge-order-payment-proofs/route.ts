import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/verify-cron-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeExpiredOrderPaymentProofs } from "@/lib/orders/purge-expired-payment-proofs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron diario: borra archivos de comprobantes de pedidos con más de 60 días.
 * Conserva el resto del registro del pedido en la base de datos.
 */
export async function GET(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: "No autorizado.", detail: auth.reason },
      { status: 401 },
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear cliente admin.",
      },
      { status: 500 },
    );
  }

  try {
    const result = await purgeExpiredOrderPaymentProofs(admin);
    return NextResponse.json({
      ok: true,
      ...result,
      source: auth.source ?? "unknown",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Fallo al purgar comprobantes.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
