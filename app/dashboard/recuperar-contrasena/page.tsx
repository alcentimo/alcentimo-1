import Link from "next/link";
import { ForgotPasswordPanel } from "@/components/dashboard/ForgotPasswordPanel";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export const dynamic = "force-dynamic";

export default function RecoverPasswordPage() {
  return (
    <AuthPageShell
      title="Recupera el acceso"
      description="Te ayudamos a restablecer tu contraseña de forma segura."
      footer={
        <p className="text-center text-sm text-zinc-500">
          ¿Recordaste tu contraseña?{" "}
          <Link href="/dashboard/login" className="link-brand">
            Inicia sesión
          </Link>
        </p>
      }
    >
      <ForgotPasswordPanel />
    </AuthPageShell>
  );
}
