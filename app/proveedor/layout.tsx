import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { SupplierChrome } from "@/components/supplier/SupplierChrome";
import { resolveSupplierAuthEmail } from "@/lib/supplier/access";

export const metadata = {
  title: "Hub de proveedores",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProveedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Suspense
      fallback={
        <div className="supplier-hub-shell">
          <main className="supplier-hub-main">
            <div className="supplier-hub-card text-sm text-zinc-500">
              Cargando hub…
            </div>
          </main>
        </div>
      }
    >
      <SupplierChrome
        email={resolveSupplierAuthEmail(user) ?? user?.email ?? null}
      >
        {children}
      </SupplierChrome>
    </Suspense>
  );
}
