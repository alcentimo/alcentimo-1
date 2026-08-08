import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Lanzamiento: la gestión de Equipo está oculta en dashboards de tienda.
 * La UI de TeamTab y las actions se conservan para reactivar después;
 * el acceso de clientes a esta ruta se desvía al panel principal.
 */
export default async function EquipoPage() {
  redirect("/dashboard/catalogo");
}
