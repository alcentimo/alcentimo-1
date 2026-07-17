import Link from "next/link";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export const dynamic = "force-dynamic";

export default function ResetPasswordSuccessPage() {
  return (
    <AuthPageShell
      title="Contraseña actualizada"
      description="Tu acceso quedó restablecido. Inicia sesión con tu nueva contraseña."
    >
      <div className="card-panel mx-auto w-full max-w-md">
        <div className="alert-success text-base sm:text-sm">
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
    </AuthPageShell>
  );
}
