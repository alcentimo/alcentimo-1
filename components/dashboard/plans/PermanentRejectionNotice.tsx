import Link from "next/link";
import type { ManualPayment } from "@/lib/database.types";
import { DASHBOARD_PLANS_HREF } from "@/src/config/plans";

const PLAN_LABELS: Record<string, string> = {
  starter: "Pro",
  premium: "Business",
};

interface PermanentRejectionNoticeProps {
  payment: ManualPayment;
}

/** Aviso cuando el admin rechazó definitivamente una solicitud de pago. */
export function PermanentRejectionNotice({
  payment,
}: PermanentRejectionNoticeProps) {
  const planLabel = PLAN_LABELS[payment.plan_id] ?? payment.plan_id;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/80 p-5 dark:border-red-900/50 dark:bg-red-950/25">
      <h2 className="text-base font-semibold text-red-900 dark:text-red-200">
        Solicitud rechazada permanentemente
      </h2>
      <p className="mt-2 text-sm text-red-800/90 dark:text-red-200/90">
        Tu solicitud del plan {planLabel} fue rechazada de forma definitiva.
        El acceso asociado a ese pago ya no aplica. Si crees que fue un error,
        contacta soporte con una referencia distinta.
      </p>
      {payment.admin_note ? (
        <p className="mt-3 rounded-lg border border-red-200/80 bg-white/70 px-3 py-2 text-sm text-red-950 dark:border-red-900/40 dark:bg-zinc-950/40 dark:text-red-100">
          <span className="font-medium">Motivo: </span>
          {payment.admin_note}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-red-700/80 dark:text-red-300/80">
        Ref: <span className="font-mono">{payment.reference_number}</span>
      </p>
      <Link
        href={DASHBOARD_PLANS_HREF}
        className="mt-4 inline-flex text-sm font-medium text-red-800 underline underline-offset-2 dark:text-red-200"
      >
        Ver planes disponibles
      </Link>
    </div>
  );
}
