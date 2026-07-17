import Link from "next/link";
import { AuthPanel } from "@/components/dashboard/AuthPanel";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export const dynamic = "force-dynamic";

export default function DashboardLoginPage() {
  return (
    <AuthPageShell
      title="Gestiona tu inventario"
      description="Inicia sesión para publicar productos y compartir tu catálogo."
      footer={
        <p className="text-center text-sm text-zinc-500">
          ¿No tienes cuenta?{" "}
          <Link href="/#precios" className="link-brand">
            Conoce los planes
          </Link>
        </p>
      }
    >
      <AuthPanel />
    </AuthPageShell>
  );
}
