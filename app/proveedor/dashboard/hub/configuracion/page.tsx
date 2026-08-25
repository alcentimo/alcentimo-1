import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { SupplierStorefrontSettingsPanel } from "@/components/supplier/SupplierStorefrontSettingsPanel";
import { SupplierEmptyState } from "@/components/supplier/SupplierEmptyState";
import { Settings2 } from "lucide-react";
import { getSupplierPublicStorefront } from "@/lib/supplier/get-storefront";
import { requireSupplierHubPageUser } from "@/lib/supplier/require-hub-page";

export const dynamic = "force-dynamic";

export default async function ProveedorHubConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireSupplierHubPageUser();
  const { tab } = await searchParams;
  const storefront = await getSupplierPublicStorefront(user.id);

  return (
    <div className="settings-page-shell mx-auto max-w-6xl space-y-6 md:space-y-8">
      <DashboardPageHeader
        sectionLabel="Suministro"
        title="Configuración"
        description={
          storefront
            ? `Marca, envíos y pagos de tu catálogo · ${storefront.tradeName}.`
            : "Ajustes de tu cuenta de proveedor en Alcéntimo."
        }
      />
      {storefront ? (
        <SupplierStorefrontSettingsPanel
          storefront={storefront}
          initialTab={tab}
        />
      ) : (
        <SupplierEmptyState
          icon={Settings2}
          title="Sin vitrina pública aún"
          description="Cuando Alcéntimo active tu catálogo público, aquí podrás editar marca, envíos y pagos. Tu perfil y sesión se gestionan desde el menú de cuenta."
        />
      )}
    </div>
  );
}
