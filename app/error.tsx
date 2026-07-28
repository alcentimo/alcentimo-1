"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <main className="page-shell-auth flex min-h-dvh flex-col items-center justify-center safe-area-inset">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-amber-50/80 via-zinc-50 to-zinc-50 dark:from-amber-950/20 dark:via-zinc-950 dark:to-zinc-950"
        aria-hidden="true"
      />
      <PageContainer narrow className="relative py-10">
        <div className="card-panel mx-auto max-w-sm text-center">
          <BrandLogo href="/" centered className="mx-auto justify-center" />
          <p className="section-label mt-4">Error</p>
          <h1 className="mt-2 text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-50">
            Algo salió mal
          </h1>
          <p className="mt-2 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
            Ocurrió un fallo inesperado. Puedes reintentar o volver al inicio.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" onClick={reset} className="btn-primary">
              Reintentar
            </button>
            <Link href="/" className="btn-brand-outline">
              Ir al inicio
            </Link>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
