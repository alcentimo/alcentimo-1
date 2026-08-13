import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron/verify-cron-request";
import { applyDuePendingPlanChanges } from "@/lib/plans/apply-pending-plans";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron horario: aplica downgrades programados cuyo corte ya venció.
 */
export async function GET(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: "No autorizado.", detail: auth.reason },
      { status: 401 },
    );
  }

  try {
    const result = await applyDuePendingPlanChanges({ limit: 500 });
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
            : "Fallo al aplicar cambios de plan pendientes.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
