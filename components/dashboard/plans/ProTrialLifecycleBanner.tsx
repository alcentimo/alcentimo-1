"use client";

import Link from "next/link";
import {
  formatProTrialEndsAt,
  type ProTrialPhase,
} from "@/lib/plans/trial";

interface ProTrialLifecycleBannerProps {
  phase: ProTrialPhase;
  endsAt: string | null;
  graceEndsAt: string | null;
}

/**
 * Aviso post-prueba: prórroga (5 días) o modo revisión (hasta cierre admin).
 */
export function ProTrialLifecycleBanner({
  phase,
  endsAt,
  graceEndsAt,
}: ProTrialLifecycleBannerProps) {
  if (phase !== "grace" && phase !== "review") {
    return null;
  }

  const endsLabel = formatProTrialEndsAt(endsAt);
  const graceLabel = formatProTrialEndsAt(graceEndsAt);

  if (phase === "grace") {
    return (
      <div
        role="status"
        className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      >
        <p className="text-sm font-semibold">Tu prueba Pro terminó</p>
        <p className="mt-1 text-sm leading-relaxed opacity-90">
          {endsLabel ? (
            <>
              La prueba finalizó el <strong>{endsLabel}</strong>. Conservas los
              beneficios Pro durante una prórroga de 5 días
              {graceLabel ? (
                <>
                  {" "}
                  (hasta el <strong>{graceLabel}</strong>)
                </>
              ) : null}
              .
            </>
          ) : (
            <>
              Conservas los beneficios Pro durante una prórroga de 5 días.
            </>
          )}{" "}
          Luego tu cuenta quedará en revisión sin bloqueos automáticos.
        </p>
        <Link
          href="/dashboard/planes"
          className="mt-2 inline-flex text-sm font-semibold underline underline-offset-2"
        >
          Ver planes y suscribirte
        </Link>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
    >
      <p className="text-sm font-semibold">Cuenta en revisión</p>
      <p className="mt-1 text-sm leading-relaxed opacity-90">
        Tu prueba y la prórroga de 5 días ya terminaron. Tu cuenta sigue
        accesible con beneficios Pro hasta que un administrador ajuste tu plan.
        No hay desactivación automática.
      </p>
      <Link
        href="/dashboard/planes"
        className="mt-2 inline-flex text-sm font-semibold underline underline-offset-2"
      >
        Ver planes
      </Link>
    </div>
  );
}
