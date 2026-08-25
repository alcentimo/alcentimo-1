import { redirect } from "next/navigation";
import { requireSupplierHubSession } from "@/lib/supplier/own-store";

/** Rutas clonadas bajo /proveedor/dashboard: el panel de tienda vive en /dashboard. */
export async function redirectSupplierStoreDashboard(merchantPath: string) {
  const { storefront } = await requireSupplierHubSession();
  if (storefront?.storeModeEnabled) {
    redirect(merchantPath);
  }
  redirect("/proveedor/dashboard/hub");
}
