import { Suspense } from "react";
import { AuthPanel } from "@/components/dashboard/AuthPanel";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import {
  AuthBootSplash,
  AuthBootSplashFallback,
} from "@/components/auth/AuthBootSplash";
import { AuthSessionRedirect } from "@/components/auth/AuthSessionRedirect";

export const dynamic = "force-dynamic";

export default function DashboardLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <Suspense fallback={<AuthBootSplashFallback />}>
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
    <AuthBootSplash>
      <Suspense fallback={null}>
        <AuthSessionRedirect />
      </Suspense>
      <AuthPageShell
        title={isInvitationFlow ? "Únete al equipo" : "Gestiona tu inventario"}
        description={
          isInvitationFlow
            ? "Inicia sesión o crea una cuenta para aceptar tu invitación."
            : "Inicia sesión para publicar productos y compartir tu catálogo."
        }
      >
        <AuthPanel />
      </AuthPageShell>
    </AuthBootSplash>
  );
}
