import Link from "next/link";
import { ResetPasswordPanel } from "@/components/dashboard/ResetPasswordPanel";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <AuthPageShell
      title="Restablece tu contraseña"
      description="Crea una nueva contraseña para continuar gestionando tu catálogo."
      footer={
        <p className="text-center text-sm text-zinc-500">
          ¿Necesitas otro enlace?{" "}
          <Link href="/dashboard/recuperar-contrasena" className="link-brand">
            Solicitar recuperación
          </Link>
        </p>
      }
    >
      <ResetPasswordPanel />
    </AuthPageShell>
  );
}
