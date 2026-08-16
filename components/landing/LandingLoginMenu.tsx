"use client";

import Link from "next/link";
import { ChevronDown, Package, Store } from "lucide-react";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { MERCHANT_LOGIN_HREF } from "@/lib/landing/merchant-signup-href";
import { SUPPLIER_DASHBOARD_PATH } from "@/lib/landing/supplier-zone-href";

const loginOptions = [
  {
    href: MERCHANT_LOGIN_HREF,
    label: "Panel de tienda",
    description: "Dropshipping y catálogo",
    icon: Store,
  },
  {
    href: SUPPLIER_DASHBOARD_PATH,
    label: "Panel de proveedores",
    description: "Mayoristas y catálogo B2B",
    icon: Package,
  },
] as const;

interface LandingLoginMenuProps {
  /** Variante compacta para la barra desktop. */
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

/** Menú de acceso separado: tienda vs proveedores. */
export function LandingLoginMenu({
  variant = "desktop",
  onNavigate,
}: LandingLoginMenuProps) {
  if (variant === "mobile") {
    return (
      <div className="mt-2 border-t border-zinc-200/70 pt-3 dark:border-zinc-800/70">
        <p className="px-2 pb-1 text-xs font-semibold tracking-[0.12em] text-zinc-400 uppercase">
          Iniciar sesión
        </p>
        {loginOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Link
              key={option.href}
              href={option.href}
              prefetch={true}
              onClick={onNavigate}
              className="landing-nav-link touch-manipulation flex items-start gap-3 justify-start px-2 py-3 text-base"
            >
              <Icon
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium text-zinc-800">{option.label}</span>
                <span className="text-sm font-normal text-zinc-500">
                  {option.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <DropdownMenu
      align="end"
      menuClassName="min-w-[15.5rem] p-1"
      trigger={
        <button
          type="button"
          className="landing-nav-link inline-flex items-center gap-1 touch-manipulation"
          aria-haspopup="menu"
          aria-label="Iniciar sesión: elige panel de tienda o de proveedores"
        >
          Iniciar sesión
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
        </button>
      }
    >
      {(close) => (
        <>
          {loginOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Link
                key={option.href}
                href={option.href}
                prefetch={true}
                role="menuitem"
                onClick={close}
                className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                <Icon
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                  aria-hidden="true"
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium leading-tight">{option.label}</span>
                  <span className="text-xs font-normal text-zinc-500">
                    {option.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </>
      )}
    </DropdownMenu>
  );
}
