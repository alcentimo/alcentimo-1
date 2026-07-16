import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AjustesRedirectPage() {
  redirect("/dashboard/catalogo?tab=ajustes");
}
