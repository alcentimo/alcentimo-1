import { createClient } from "@/lib/supabase/server";
import { getDashboardSession } from "@/lib/auth/get-user-profile";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CountryProvider } from "@/components/providers/CountryProvider";

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
    <CountryProvider country={store?.country}>
      <DashboardLayout
        storeName={store?.name ?? null}
        userEmail={authUser.email ?? null}
        planName={authUser.plan.name}
      >
        {children}
      </DashboardLayout>
    </CountryProvider>
  );
}
