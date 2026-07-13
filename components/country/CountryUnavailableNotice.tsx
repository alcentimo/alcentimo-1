import Link from "next/link";
import type { StoreCountryOption } from "@/lib/onboarding/countries";
import { COUNTRY_UNAVAILABLE_MESSAGE } from "@/lib/country-config";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { PageContainer } from "@/components/ui/PageContainer";

interface CountryUnavailableNoticeProps {
  country: StoreCountryOption;
}

export function CountryUnavailableNotice({
  country,
}: CountryUnavailableNoticeProps) {
  return (
    <main className="page-shell-auth flex min-h-dvh flex-col justify-center safe-area-inset">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-teal-50/80 via-zinc-50 to-zinc-50 dark:from-teal-950/30 dark:via-zinc-950 dark:to-zinc-950"
        aria-hidden="true"
      />

      <PageContainer narrow className="relative py-10 sm:py-14">
        <div className="card-panel mx-auto max-w-md space-y-5 text-center">
          <BrandLogo href="/" centered className="justify-center" />
          <div>
            <p className="section-label">Región no disponible</p>
            <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {country}
            </h1>
            <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
              {COUNTRY_UNAVAILABLE_MESSAGE}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/" className="btn-secondary">
              Volver al inicio
            </Link>
            <Link href="/dashboard/login" className="btn-primary">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
