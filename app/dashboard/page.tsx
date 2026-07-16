import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<{ onboarded?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.onboarded === "1") query.set("onboarded", "1");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  redirect(`/dashboard/catalogo${suffix}`);
}
