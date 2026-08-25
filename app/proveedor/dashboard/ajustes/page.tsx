import { redirect } from "next/navigation";
import { requireSupplierHubPageUser } from "@/lib/supplier/require-hub-page";

export const dynamic = "force-dynamic";

export default async function ProveedorAjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireSupplierHubPageUser();
  const { tab } = await searchParams;
  const query = tab ? `?tab=${encodeURIComponent(tab)}` : "";
  redirect(`/proveedor/dashboard/hub/configuracion${query}`);
}
