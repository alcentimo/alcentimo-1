import { redirect } from "next/navigation";
import { ADMIN_OWN_STORE_NAV_PREFIX } from "@/src/config/dashboard-nav";

export default function AdminOwnStoreIndexPage() {
  redirect(`${ADMIN_OWN_STORE_NAV_PREFIX}/catalogo`);
}
