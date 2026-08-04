import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { getSiteUrl } from "@/lib/site-url";

export const metadata = {
  title: "Tienda no encontrada — alcentimo",
  robots: { index: false, follow: false },
};

/**
 * Vista amigable cuando un dominio personalizado apunta a Alcéntimo
 * pero ya no hay una tienda activa asociada (p. ej. tienda eliminada).
 */
export default function DominioSinTiendaPage() {
  const platformUrl = getSiteUrl();

  return (
    <main className="page-shell-auth flex min-h-dvh flex-col items-center justify-center safe-area-inset">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-teal-50/80 via-zinc-50 to-zinc-50 dark:from-teal-950/30 dark:via-zinc-950 dark:to-zinc-950"
        aria-hidden="true"
      />

      <PageContainer narrow className="relative py-10">
        <div className="card-panel mx-auto max-w-sm text-center">
          <BrandLogo
            href={platformUrl}
            centered
            className="mx-auto justify-center"
          />
          <p className="section-label mt-4">404</p>
          <h1 className="mt-2 text-xl font-bold text-zinc-900 sm:text-2xl dark:text-zinc-50">
            Tienda no encontrada
          </h1>
          <p className="mt-2 text-base text-zinc-500 sm:text-sm dark:text-zinc-400">
            Este dominio ya no está asociado a una tienda activa en Alcéntimo.
            Puede haber sido eliminada o desactivada.
          </p>
          <Link href={platformUrl} className="btn-primary mt-6 inline-flex">
            Ir a Alcéntimo
          </Link>
        </div>
      </PageContainer>
    </main>
  );
}
