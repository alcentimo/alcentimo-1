"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CatalogoSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard/catalogo/error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
        No pudimos cargar el catálogo
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        La conexión o la sesión tardó más de lo esperado. Reintenta sin salir de
        la app.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <button type="button" onClick={reset} className="btn-primary">
          Reintentar
        </button>
        <button
          type="button"
          className="btn-brand-outline"
          onClick={() => {
            window.location.assign("/dashboard/catalogo");
          }}
        >
          Recargar catálogo
        </button>
        <Link href="/dashboard/login" className="btn-brand-outline">
          Volver al acceso
        </Link>
      </div>
    </div>
  );
}
