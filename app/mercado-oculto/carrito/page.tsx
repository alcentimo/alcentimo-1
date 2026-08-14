import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasMercadoOcultoSuperAdminUser } from "@/lib/mercado-oculto/access";
import { MercadoCartView } from "@/components/mercado-oculto/MercadoCartView";

export const dynamic = "force-dynamic";

export default async function MercadoCarritoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard/login?next=/mercado-oculto/carrito");
  }
  if (!hasMercadoOcultoSuperAdminUser(user)) {
    notFound();
  }

  return <MercadoCartView />;
}
