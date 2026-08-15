import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InventarioRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const params = await searchParams;
  if (params.nuevo === "1") {
    redirect("/dashboard/catalogo?vista=disponibles");
  }
  redirect("/dashboard/catalogo");
}
