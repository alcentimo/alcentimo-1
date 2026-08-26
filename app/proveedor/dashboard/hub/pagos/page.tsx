import { redirect } from "next/navigation";
import { requireSupplierHubPageUser } from "@/lib/supplier/require-hub-page";

export const dynamic = "force-dynamic";

export default async function ProveedorHubPagosPage() {
  await requireSupplierHubPageUser();
  redirect("/proveedor/dashboard/hub/pedidos");
}
