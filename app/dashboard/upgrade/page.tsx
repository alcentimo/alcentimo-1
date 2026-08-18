import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Upgrade de planes de pago desactivado. */
export default function UpgradePage() {
  redirect("/dashboard/catalogo");
}
