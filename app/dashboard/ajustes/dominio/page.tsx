import { redirect } from "next/navigation";

/**
 * Atajo estable a Configuración → Dominio.
 * La UI vive en /dashboard/ajustes?tab=domains.
 */
export default function AjustesDominioRedirectPage() {
  redirect("/dashboard/ajustes?tab=domains");
}
