"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard/error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
        No pudimos cargar esta sección
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Ocurrió un error en el panel. Reintenta o vuelve al catálogo.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <button type="button" onClick={reset} className="btn-primary">
          Reintentar
        </button>
        <Link href="/dashboard/catalogo" className="btn-brand-outline">
          Ir al catálogo
        </Link>
      </div>
    </div>
  );
}
