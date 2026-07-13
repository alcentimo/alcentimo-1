import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOptionalAuthUser } from "@/lib/auth/optional-auth";
import { userHasStore } from "@/lib/stores";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { PageContainer } from "@/components/ui/PageContainer";
import { BrandLogo } from "@/components/ui/BrandLogo";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const user = await getOptionalAuthUser(supabase);

  if (!user) {
    redirect("/dashboard/login?next=/onboarding");
  }

  if (await userHasStore(supabase, user.id)) {
    redirect("/dashboard");
  }

  return (
    <main className="page-shell-auth flex min-h-dvh flex-col justify-center safe-area-inset">
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-b from-teal-50/80 via-zinc-50 to-zinc-50 dark:from-teal-950/30 dark:via-zinc-950 dark:to-zinc-950"
        aria-hidden="true"
      />

      <PageContainer narrow className="relative py-10 sm:py-14">
        <div className="mb-8 text-center">
          <BrandLogo href="/" centered className="justify-center" />
          <p className="section-label mt-6">Configuración rápida</p>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-50">
            Tu tienda en menos de un minuto
          </h1>
          <p className="mt-2 text-base text-zinc-500 sm:text-sm lg:text-base dark:text-zinc-400">
            Define el nombre, el tipo de negocio y tu WhatsApp. Nosotros generamos el enlace del catálogo.
          </p>
        </div>

        <OnboardingForm />
      </PageContainer>
    </main>
  );
}
