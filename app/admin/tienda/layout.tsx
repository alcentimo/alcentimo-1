import { AdminOwnStoreWorkspace } from "@/components/admin/AdminOwnStoreWorkspace";
import { requireAdminOwnStoreUser } from "@/lib/admin/require-admin-page";

export default async function AdminOwnStoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminOwnStoreUser();

  return (
    <div className="admin-dashboard-page">
      <AdminOwnStoreWorkspace>{children}</AdminOwnStoreWorkspace>
    </div>
  );
}
