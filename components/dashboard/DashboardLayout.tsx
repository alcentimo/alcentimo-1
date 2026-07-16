"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ImmersiveModeProvider, useImmersiveMode } from "@/components/inbox/ImmersiveModeProvider";

interface DashboardLayoutProps {
  children: React.ReactNode;
  storeName: string | null;
  storeSlug: string | null;
  userEmail: string | null;
  planName?: string | null;
}

function isStandaloneAuthPath(pathname: string): boolean {
  return (
    pathname === "/dashboard/recuperar-contrasena" ||
    pathname.startsWith("/dashboard/restablecer-contrasena")
  );
}

function isMensajesPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard/mensajes");
}

function DashboardShell({
  children,
  storeName,
  storeSlug,
  userEmail,
  planName = null,
}: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isImmersive } = useImmersiveMode();
  const immersiveActive = isMensajesPath(pathname) && isImmersive;

  function closeSidebar() {
    setSidebarOpen(false);
  }

  useEffect(() => {
    if (!sidebarOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/dashboard/login");
    router.refresh();
  }

  return (
    <div
      className={`flex h-dvh overflow-hidden bg-zinc-100 dark:bg-zinc-950 ${
        immersiveActive ? "dashboard-shell--immersive" : ""
      }`}
    >
      {sidebarOpen && !immersiveActive && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-[2px] lg:hidden"
          onClick={closeSidebar}
          aria-label="Cerrar menú"
        />
      )}

      <DashboardSidebar
        pathname={pathname}
        storeName={storeName}
        storeSlug={storeSlug}
        userEmail={userEmail}
        planName={planName}
        mobileOpen={sidebarOpen}
        immersiveHidden={immersiveActive}
        onCloseMobile={closeSidebar}
        onLogout={() => void handleLogout()}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!immersiveActive && (
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 lg:hidden dark:border-zinc-800 dark:bg-zinc-950">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="touch-target rounded-xl text-zinc-700 dark:text-zinc-300"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <BrandLogo href="/dashboard" size="sm" subtitle={storeName ?? undefined} />
            <div className="w-11" aria-hidden="true" />
          </header>
        )}

        <main
          className={`flex min-h-0 flex-1 flex-col safe-area-inset ${
            isMensajesPath(pathname)
              ? "dashboard-main--mensajes overflow-hidden"
              : "overflow-y-auto p-4 sm:p-6 lg:p-8"
          } ${immersiveActive ? "dashboard-main--immersive" : ""}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardLayout(props: DashboardLayoutProps) {
  const pathname = usePathname();

  if (isStandaloneAuthPath(pathname)) {
    return (
      <div className="relative min-h-dvh bg-zinc-50 dark:bg-zinc-950">{props.children}</div>
    );
  }

  return (
    <ImmersiveModeProvider>
      <DashboardShell {...props} />
    </ImmersiveModeProvider>
  );
}
