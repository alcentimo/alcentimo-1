import { MercadoCartView } from "@/components/mercado-oculto/MercadoCartView";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MercadoCarritoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <MercadoCartView isAuthenticated={Boolean(user)} />;
}
