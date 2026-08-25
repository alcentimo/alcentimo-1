import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SupplierChrome } from "@/components/supplier/SupplierChrome";
import { resolveSupplierAuthEmail } from "@/lib/supplier/access";
import { getSupplierPublicStorefront } from "@/lib/supplier/get-storefront";
import { CountryProvider } from "@/components/providers/CountryProvider";

export default async function ProveedorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = resolveSupplierAuthEmail(user) ?? user?.email ?? null;
  const storefront = user
    ? await getSupplierPublicStorefront(user.id)
    : null;

  return (
    <CountryProvider country="Venezuela">
      <Suspense
        fallback={
          <div className="supplier-hub-shell">
            <main className="supplier-hub-main">
              <div className="supplier-hub-card text-sm text-zinc-500">
                Cargando panel…
              </div>
            </main>
          </div>
        }
      >
        <SupplierChrome
          email={email}
          showStorefrontSettings={storefront?.showPublicCatalog === true}
          showMerchantStoreLink={storefront?.storeModeEnabled === true}
        >
          {children}
        </SupplierChrome>
      </Suspense>
    </CountryProvider>
  );
}
