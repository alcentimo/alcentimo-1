import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Checkout de suscripción desactivado. */
export default function PagoStatusPage() {
  redirect("/dashboard/catalogo");
}
