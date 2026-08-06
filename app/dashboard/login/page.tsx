import { Suspense } from "react";
import { AuthPanel } from "@/components/dashboard/AuthPanel";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import {
  AuthBootGate,
  AuthBootSplashFallback,
} from "@/components/auth/AuthBootGate";

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
    <Suspense fallback={<AuthBootSplashFallback />}>
      <AuthBootGate>
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
      </AuthBootGate>
    </Suspense>
  );
}
