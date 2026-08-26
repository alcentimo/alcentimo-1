import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { SupplierHubProfilePanel } from "@/components/supplier/SupplierHubProfilePanel";
import { SupplierPaymentsPanel } from "@/components/supplier/SupplierPaymentsPanel";
import { SupplierEmptyState } from "@/components/supplier/SupplierEmptyState";
import { Settings2 } from "lucide-react";
import { getSupplierHubProfile } from "@/lib/supplier/profile-actions";
import { getSupplierPaymentConfig } from "@/lib/supplier/payment-actions";
import { defaultSupplierPaymentConfig } from "@/lib/supplier/payment-types";
import { requireSupplierHubPageUser } from "@/lib/supplier/require-hub-page";

export const dynamic = "force-dynamic";

export default async function ProveedorHubConfiguracionPage() {
  await requireSupplierHubPageUser();
  const [profileResult, paymentConfigResult] = await Promise.all([
    getSupplierHubProfile(),
    getSupplierPaymentConfig(),
  ]);

  return (
    <div className="settings-page-shell mx-auto max-w-6xl space-y-6 md:space-y-8">
      <DashboardPageHeader
        sectionLabel="Suministro"
        title="Configuración"
        description="Perfil mayorista, cuenta para liquidaciones y dirección de recogida. Este panel no gestiona vitrinas al detal."
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
      {paymentConfigResult.error ? (
        <p className="supplier-hub-alert">
          No se pudieron cargar los datos de pago.
        </p>
      ) : null}
      <SupplierPaymentsPanel
        initialConfig={
          paymentConfigResult.config ?? defaultSupplierPaymentConfig()
        }
      />
    </div>
  );
}
