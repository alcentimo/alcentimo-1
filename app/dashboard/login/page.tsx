import { Suspense } from "react";
import { AuthPanel } from "@/components/dashboard/AuthPanel";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";
import { AuthSessionRedirect } from "@/components/auth/AuthSessionRedirect";

export const dynamic = "force-dynamic";

export default async function DashboardLoginPage({
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
    >
      <Suspense fallback={<AuthFormSkeleton />}>
        <AuthSessionRedirect />
        <AuthPanel />
      </Suspense>
    </AuthPageShell>
  );
}
