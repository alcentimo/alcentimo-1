import { redirect } from "next/navigation";
import { requireSupplierHubSession } from "@/lib/supplier/own-store";

export const dynamic = "force-dynamic";

export default async function ProveedorDashboardIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await requireSupplierHubSession();

  const params = await searchParams;
  const tabRaw = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  if (tabRaw === "pedidos") {
    redirect("/proveedor/dashboard/hub/pedidos");
  }
  if (tabRaw === "pagos") {
    redirect("/proveedor/dashboard/hub/pagos");
  }
  if (tabRaw === "historial") {
    redirect("/proveedor/dashboard/hub/analitica");
  }
  redirect("/proveedor/dashboard/hub");
}
