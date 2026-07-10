import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function NotFound() {
  return (
    <main className="page-shell-auth flex min-h-dvh flex-col items-center justify-center safe-area-inset">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-teal-50/80 via-zinc-50 to-zinc-50 dark:from-teal-950/30 dark:via-zinc-950 dark:to-zinc-950"
        aria-hidden="true"
      />

      <PageContainer narrow className="relative py-10">
        <div className="card-panel mx-auto max-w-sm text-center">
          <BrandLogo href="/" centered className="mx-auto justify-center" />
          <p className="section-label mt-4">Catálogo</p>
          <h1 className="mt-2 text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-50">
            Tienda no encontrada
          </h1>
          <p className="mt-2 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
            El enlace no existe o la tienda está inactiva.
          </p>
          <Link href="/" className="btn-primary mt-6">
            Volver al inicio
          </Link>
        </div>
      </PageContainer>
    </main>
  );
}
