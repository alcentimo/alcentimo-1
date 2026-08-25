import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { SupplierHubProfilePanel } from "@/components/supplier/SupplierHubProfilePanel";
import { SupplierEmptyState } from "@/components/supplier/SupplierEmptyState";
import { Settings2 } from "lucide-react";
import { getSupplierHubProfile } from "@/lib/supplier/profile-actions";
import { requireSupplierHubPageUser } from "@/lib/supplier/require-hub-page";

export const dynamic = "force-dynamic";

export default async function ProveedorHubConfiguracionPage() {
  await requireSupplierHubPageUser();
  const profileResult = await getSupplierHubProfile();

  return (
    <div className="settings-page-shell mx-auto max-w-6xl space-y-6 md:space-y-8">
      <DashboardPageHeader
        sectionLabel="Suministro"
        title="Configuración"
        description="Perfil mayorista y dirección de recogida para Alcéntimo. Este panel no gestiona vitrinas al detal."
      />
      {profileResult.error || !profileResult.profile ? (
        <SupplierEmptyState
          icon={Settings2}
          title="No se pudo cargar el perfil"
          description={
            profileResult.error ??
            "Vuelve a iniciar sesión para editar la dirección de almacén y los horarios de retiro."
          }
        />
      ) : (
        <SupplierHubProfilePanel initialProfile={profileResult.profile} />
      )}
    </div>
  );
}
