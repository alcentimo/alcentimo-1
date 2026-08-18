import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOptionalAuthUser } from "@/lib/auth/optional-auth";
import { ensureDefaultMerchantStore } from "@/lib/stores/ensure-default-merchant-store";

export const dynamic = "force-dynamic";

/** El registro ya no usa este paso: crea tienda genérica y va al panel. */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const user = await getOptionalAuthUser(supabase);

  if (!user) {
    redirect("/dashboard/login?next=/dashboard");
  }

  try {
    await ensureDefaultMerchantStore(supabase, user);
  } catch (error) {
    console.error("[onboarding] default store", error);
  }
  redirect("/dashboard");
}
