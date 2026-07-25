import Link from "next/link";
import { Suspense } from "react";
import { AuthPanel } from "@/components/dashboard/AuthPanel";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export const dynamic = "force-dynamic";

export default function DashboardLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="card-panel mx-auto w-full max-w-md animate-pulse p-8">
          Cargando…
        </div>
      }
    >
      <DashboardLoginPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardLoginPageContent({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const isInvitationFlow = Boolean(next?.includes("/dashboard/invitacion"));

  return (
    <AuthPageShell
      title={isInvitationFlow ? "Únete al equipo" : "Gestiona tu inventario"}
      description={
        isInvitationFlow
          ? "Inicia sesión o crea una cuenta para aceptar tu invitación."
          : "Inicia sesión para publicar productos y compartir tu catálogo."
      }
      footer={
        isInvitationFlow ? null : (
          <p className="text-center text-sm text-zinc-500">
            ¿No tienes cuenta?{" "}
            <Link href="/#precios" className="link-brand">
              Conoce los planes
            </Link>
          </p>
        )
      }
    >
      <AuthPanel />
    </AuthPageShell>
  );
}
