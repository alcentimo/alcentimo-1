import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { BrandLogo } from "@/components/ui/BrandLogo";

export const dynamic = "force-dynamic";

export default function ResetPasswordSuccessPage() {
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
        </div>

        <div className="card-panel mx-auto w-full max-w-md">
          <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl dark:text-zinc-50">
            Contraseña actualizada
          </h2>
          <div className="alert-success mt-4 text-base text-teal-800 sm:text-sm dark:text-teal-200">
            Tu contraseña se cambió correctamente. Por seguridad, cierra sesión en
            otros dispositivos e inicia sesión de nuevo con tu nueva contraseña.
          </div>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            Ya puedes acceder al panel con tus nuevas credenciales.
          </p>
          <Link
            href="/dashboard/login"
            className="btn-primary mt-6 block w-full text-center"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </PageContainer>
    </main>
  );
}
