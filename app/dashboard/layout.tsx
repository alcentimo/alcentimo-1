import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { getStoreCatalogUrl } from "@/lib/stores";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const dynamic = "force-dynamic";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const session = await getDashboardSession(supabase);

  if (!session) {
    return <>{children}</>;
  }

  const { authUser, store } = session;

  return (
    <DashboardLayout
      storeName={store?.name ?? null}
      catalogUrl={store ? getStoreCatalogUrl(store.slug) : null}
      userEmail={authUser.email ?? null}
    >
      {children}
    </DashboardLayout>
  );
}
