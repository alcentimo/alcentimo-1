import Link from "next/link";
import { ForgotPasswordPanel } from "@/components/dashboard/ForgotPasswordPanel";
import { PageContainer } from "@/components/ui/PageContainer";
import { BrandLogo } from "@/components/ui/BrandLogo";

export const dynamic = "force-dynamic";

export default function RecoverPasswordPage() {
  return (
    <main className="page-shell-auth flex min-h-dvh flex-col justify-center safe-area-inset">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-teal-50/80 via-zinc-50 to-zinc-50 dark:from-teal-950/30 dark:via-zinc-950 dark:to-zinc-950"
        aria-hidden="true"
      />

      <PageContainer narrow className="relative py-10 sm:py-14">
        <div className="mb-8 text-center">
          <BrandLogo href="/" centered className="justify-center" />
          <p className="section-label mt-6">Panel del negocio</p>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-50">
            Recupera el acceso
          </h1>
          <p className="mt-2 text-base text-zinc-500 sm:text-sm lg:text-base dark:text-zinc-400">
            Te ayudamos a restablecer tu contraseña de forma segura.
          </p>
        </div>
        <ForgotPasswordPanel />
        <p className="mt-6 text-center text-sm text-zinc-500">
          ¿Recordaste tu contraseña?{" "}
          <Link href="/dashboard/login" className="link-brand">
            Inicia sesión
          </Link>
        </p>
      </PageContainer>
    </main>
  );
}
