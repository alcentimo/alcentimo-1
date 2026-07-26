import Link from "next/link";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { SignupEmailVerificationPanel } from "@/components/dashboard/SignupEmailVerificationPanel";
import {
  isInvitationNextPath,
  resolvePostAuthPath,
} from "@/lib/auth/post-auth-redirect";

export const dynamic = "force-dynamic";

export default async function VerifyAccountPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
    next?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const email = params.email?.trim().toLowerCase() ?? "";
  const nextPath = resolvePostAuthPath(params.next);
  const initialError = params.error?.trim() || null;
  const isInvitationFlow = isInvitationNextPath(params.next);

  if (!email) {
    return (
      <AuthPageShell
        title="Verifica tu cuenta"
        description="Usa el enlace del correo de confirmación o regístrate de nuevo."
      >
        <div className="card-panel mx-auto w-full max-w-md space-y-4 text-center text-sm text-zinc-600 dark:text-zinc-300">
          <p>Falta el correo en el enlace. Vuelve a registrarte para recibir un nuevo código.</p>
          <Link href="/dashboard/login?mode=signup" className="btn-primary inline-flex">
            Crear cuenta
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Verifica tu cuenta"
      description="Introduce el código de 6 dígitos del correo de confirmación."
    >
      <SignupEmailVerificationPanel
        email={email}
        nextPath={nextPath}
        initialError={initialError}
        isInvitationFlow={isInvitationFlow}
      />
    </AuthPageShell>
  );
}
