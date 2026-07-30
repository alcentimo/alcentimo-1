import { AdminPwaServiceWorkerRegister } from "@/components/dashboard/AdminPwaServiceWorkerRegister";
import { DashboardSessionShell } from "@/components/dashboard/DashboardSessionShell";

/**
 * Layout síncrono: cero awaits.
 * La sesión y datos del chrome se cargan en DashboardSessionShell (cliente).
 */
export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminPwaServiceWorkerRegister />
      <DashboardSessionShell>{children}</DashboardSessionShell>
    </>
  );
}
