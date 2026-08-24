import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  resolveSupplierAccess,
  resolveSupplierAuthEmail,
} from "@/lib/supplier/access";
import { getSupplierPublicStorefront } from "@/lib/supplier/get-storefront";
import { SupplierStorefrontSettingsPanel } from "@/components/supplier/SupplierStorefrontSettingsPanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export const dynamic = "force-dynamic";

export default async function ProveedorAjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/proveedor/login?next=/proveedor/dashboard/ajustes");
  }

  const access = await resolveSupplierAccess({
    email: resolveSupplierAuthEmail(user),
    userId: user.id,
    user,
  });
  if (!access.ok) {
    redirect(`/proveedor/registro?error=${access.reason ?? "denied"}`);
  }

  const storefront = await getSupplierPublicStorefront(user.id);
  if (!storefront?.showPublicCatalog) {
    redirect("/proveedor/dashboard");
  }

  return (
    <div className="settings-page-shell mx-auto max-w-6xl space-y-6 md:space-y-8">
      <div className="hidden lg:block">
        <DashboardPageHeader
          sectionLabel="Vitrina pública"
          title="Configuración de Tienda"
          description={`Marca, envíos y pagos de tu catálogo · ${storefront.tradeName}.`}
        />
      </div>
      <SupplierStorefrontSettingsPanel
        storefront={storefront}
        initialTab={tab}
      />
    </div>
  );
}
