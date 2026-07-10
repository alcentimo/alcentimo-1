import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function CatalogFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200/80 bg-white safe-area-bottom dark:border-zinc-800 dark:bg-zinc-950">
      <PageContainer className="py-8 sm:py-10">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <BrandLogo href="/" size="sm" showName={false} />
          <p className="max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Catálogo digital con precios en USD y Bs al tipo de cambio del día.
          </p>
          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm"
            aria-label="Enlaces del catálogo"
          >
            <Link href="/" className="link-brand">
              alcentimo
            </Link>
            <Link href="/dashboard/login" className="link-brand">
              Panel
            </Link>
          </nav>
        </div>
        <p className="mt-6 border-t border-zinc-100 pt-5 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          © {new Date().getFullYear()} alcentimo · Software de inventario para Venezuela
        </p>
      </PageContainer>
    </footer>
  );
}
