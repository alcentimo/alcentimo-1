import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Activación de planes de pago desactivada. */
export default function ActivarPage() {
  redirect("/dashboard/catalogo");
}
