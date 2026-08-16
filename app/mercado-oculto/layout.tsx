import { Suspense } from "react";
import { DM_Sans, Fraunces } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { MercadoChrome } from "@/components/mercado-oculto/MercadoChrome";

export const metadata = {
  title: {
    default: "Mercado Moriche — Curaduría B2B",
    template: "%s · Mercado Moriche",
  },
  description:
    "Plataforma de curaduría B2B: catálogo mayorista con precios de proveedor y margen para tu tienda.",
  robots: {
    index: false,
    follow: false,
  },
};

const moricheDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-moriche-display",
  display: "swap",
});

const moricheSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-moriche-sans",
  display: "swap",
});

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
    <div
      className={`${moricheDisplay.variable} ${moricheSans.variable}`}
      style={{
        fontFamily:
          "var(--font-moriche-sans), ui-sans-serif, system-ui, sans-serif",
      }}
    >
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
    </div>
  );
}
