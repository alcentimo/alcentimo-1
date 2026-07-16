import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InventarioRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  query.set("tab", "inventario");
  if (params.nuevo === "1") query.set("nuevo", "1");
  redirect(`/dashboard/catalogo?${query.toString()}`);
}
