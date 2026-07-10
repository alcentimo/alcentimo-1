import { createClient } from "@/lib/supabase/server";
import { getUserStore, getStoreCatalogUrl } from "@/lib/stores";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const dynamic = "force-dynamic";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  const store = await getUserStore(supabase);

  return (
    <DashboardLayout
      storeName={store?.name ?? null}
      catalogUrl={store ? getStoreCatalogUrl(store.slug) : null}
      userEmail={user.email ?? null}
    >
      {children}
    </DashboardLayout>
  );
}
