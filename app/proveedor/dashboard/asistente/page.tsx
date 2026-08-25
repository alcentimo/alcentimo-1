import { redirectSupplierStoreDashboard } from "@/lib/supplier/redirect-supplier-store-dashboard";

export const dynamic = "force-dynamic";

export default async function ProveedorAsistentePage() {
  await redirectSupplierStoreDashboard("/dashboard/asistente");
}
