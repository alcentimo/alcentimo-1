import { createClient } from "@/lib/supabase/server";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { resolveAuthEmail } from "@/lib/support/is-support-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AdminChrome email={resolveAuthEmail(user) ?? user?.email ?? null}>
      {children}
    </AdminChrome>
  );
}
