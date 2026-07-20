import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Compatibilidad: la bandeja vive en el panel admin unificado. */
export default function AdminSoporteRedirectPage() {
  redirect("/admin/dashboard?tab=soporte");
}
