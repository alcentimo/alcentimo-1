"use client";

import {
  AdminDashboardShell,
  useAdminControlCenterNavigation,
} from "@/components/admin/AdminDashboardShell";

export function AdminOwnStoreWorkspace({
  children,
}: {
  children: React.ReactNode;
}) {
  const { goToTab } = useAdminControlCenterNavigation();

  return (
    <AdminDashboardShell activeTab="tienda" onTabChange={goToTab}>
      {children}
    </AdminDashboardShell>
  );
}
