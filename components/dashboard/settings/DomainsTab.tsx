"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { CustomDomainSection } from "@/components/dashboard/settings/CustomDomainSection";
import type { PlanId } from "@/src/config/plans";
import { DASHBOARD_PLANS_HREF } from "@/src/config/plans";
import { planIncludesCustomDomain } from "@/src/config/plan-pricing-ui";
import { cn } from "@/lib/cn";

export interface DomainsTabStore {
  slug: string;
  custom_domain?: string | null;
  custom_domain_verified?: boolean;
}

interface DomainsTabProps {
  store: DomainsTabStore;
  planId?: PlanId;
  initialDomain?: string | null;
  initialDomainMode?: "connect" | "purchase" | null;
}

function hasCustomDomainPlan(planId: PlanId | undefined): boolean {
  return planId != null && planIncludesCustomDomain(planId);
}

function ProLockedDomainCard({
  existingDomain,
}: {
  existingDomain?: string | null;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/40"
      role="group"
      aria-label="Dominio personalizado bloqueado. Exclusivo del Plan Pro."
    >
      <div
        className="pointer-events-none select-none space-y-3 p-4 opacity-45"
        aria-hidden="true"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Dominio personalizado
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <Lock className="h-3 w-3" />
            Plan Pro
          </span>
        </div>
        <div className="h-9 rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-9 rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950" />
          <div className="h-9 rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950" />
        </div>
        <div className="h-9 w-40 rounded-lg bg-zinc-300 dark:bg-zinc-700" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/55 via-white/80 to-white/90 p-4 dark:from-zinc-950/40 dark:via-zinc-950/75 dark:to-zinc-950/90">
        <div className="max-w-sm text-center">
          <span className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="inline-flex items-center gap-1.5 rounded-md border border-teal-200/80 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-200">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Exclusivo Plan Pro
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Conecta tu propio dominio
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Usa tutienda.com en lugar del subdominio de Alcéntimo. Te guiamos
            paso a paso para conectar el dominio que ya compraste.
            {existingDomain
              ? ` Tu tienda aún tiene configurado ${existingDomain}; actualiza a Pro para gestionarlo.`
              : null}
          </p>
          <Link
            href={DASHBOARD_PLANS_HREF}
            className="btn-brand mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium"
          >
            Actualizar a Plan Pro
          </Link>
        </div>
      </div>
    </div>
  );
}

export function DomainsTab({
  store,
  planId,
  initialDomain = null,
  initialDomainMode = null,
}: DomainsTabProps) {
  const canUseCustomDomain = hasCustomDomainPlan(planId);
  const existingDomain = store.custom_domain?.trim() || null;

  if (!canUseCustomDomain) {
    return (
      <div className="space-y-6">
        <ProLockedDomainCard existingDomain={existingDomain} />
        <p
          className={cn(
            "text-center text-xs text-zinc-500 dark:text-zinc-400",
          )}
        >
          En el Plan Gratis tu catálogo sigue disponible en{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {store.slug}.alcentimo.com
          </span>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CustomDomainSection
        storeSlug={store.slug}
        customDomain={store.custom_domain ?? null}
        customDomainVerified={Boolean(store.custom_domain_verified)}
        initialDomain={initialDomain}
        initialDomainMode={initialDomainMode}
      />
    </div>
  );
}
