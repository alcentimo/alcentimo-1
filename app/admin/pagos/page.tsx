import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Compatibilidad: los pagos viven en el panel admin unificado. */
export default function AdminPagosRedirectPage() {
  redirect("/admin/dashboard?tab=pagos");
}
