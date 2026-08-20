import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Compatibilidad: el listado de pagos del SaaS ya no vive en el panel admin. */
export default function AdminPagosRedirectPage() {
  redirect("/admin/dashboard?tab=tiendas");
}
