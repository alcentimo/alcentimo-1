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
  const query =
    tabRaw === "pedidos" || tabRaw === "pagos" || tabRaw === "historial"
      ? `?tab=${tabRaw}`
      : "";
  redirect(`/proveedor/dashboard/hub${query}`);
}
