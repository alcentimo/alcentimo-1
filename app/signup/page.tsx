import { Suspense } from "react";
import { AuthPanel } from "@/components/dashboard/AuthPanel";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export const dynamic = "force-dynamic";

export default function SignupPage({
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
      <SignupPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SignupPageContent({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const isInvitationFlow = Boolean(next?.includes("/dashboard/invitacion"));

  return (
    <AuthPageShell
      title={isInvitationFlow ? "Únete al equipo" : "Crea tu cuenta"}
      description={
        isInvitationFlow
          ? "Regístrate o inicia sesión para aceptar tu invitación."
          : "Crea tu cuenta con nombre, correo y contraseña. La tienda se configura después."
      }
    >
      <AuthPanel defaultMode="signup" />
    </AuthPageShell>
  );
}
