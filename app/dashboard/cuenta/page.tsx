import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Compatibilidad con enlaces antiguos: abre el panel lateral vía query param
 * sin montar una página de cuenta dedicada.
 */
export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const account =
    tab === "seguridad" ? "seguridad" : tab === "planes" ? "planes" : "perfil";
  redirect(`/dashboard/catalogo?account=${account}`);
}
