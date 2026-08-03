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
    <SupplierChrome email={resolveSupplierAuthEmail(user) ?? user?.email ?? null}>
      {children}
    </SupplierChrome>
  );
}
