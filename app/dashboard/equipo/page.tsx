import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Equipo oculto por ahora: la ruta redirige al panel principal. */
export default async function EquipoPage() {
  redirect("/dashboard/catalogo");
}
