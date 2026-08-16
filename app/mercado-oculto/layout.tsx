import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { MercadoChrome } from "@/components/mercado-oculto/MercadoChrome";

export const metadata = {
  title: "Mercado Moriche",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MercadoOcultoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Suspense
      fallback={
        <div className="mercado-shell">
          <main className="mercado-main">
            <div className="mercado-card-static text-sm text-[var(--mo-muted)]">
              Cargando Mercado Moriche…
            </div>
          </main>
        </div>
      }
    >
      <MercadoChrome email={user?.email ?? null}>{children}</MercadoChrome>
    </Suspense>
  );
}
