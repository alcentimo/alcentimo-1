import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Planes de suscripción desactivados: redirige al panel. */
export default function PlanesPage() {
  redirect("/dashboard/catalogo");
}
