"use client";

import Link from "next/link";
import { Globe } from "lucide-react";
import { CustomDomainSection } from "@/components/dashboard/settings/CustomDomainSection";
import type { PlanId } from "@/src/config/plans";
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
  return (
    planId === "starter" ||
    planId === "growth" ||
    planId === "premium" ||
    planId === "enterprise"
  );
}

export function DomainsTab({
  store,
  planId,
  initialDomain = null,
  initialDomainMode = null,
}: DomainsTabProps) {
  const canUseCustomDomain = hasCustomDomainPlan(planId);

  return (
    <div className="space-y-6">
      {!canUseCustomDomain ? (
        <div
          className={cn(
            "rounded-xl border border-teal-200/80 bg-teal-50/60 px-4 py-4 dark:border-teal-900/40 dark:bg-teal-950/20",
          )}
        >
          <div className="flex items-start gap-3">
            <Globe
              className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-400"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-teal-900 dark:text-teal-100">
                Dominio personalizado en planes de pago
              </p>
              <p className="mt-1 text-xs leading-relaxed text-teal-800/90 dark:text-teal-200/90">
                Conecta tu propio dominio (por ejemplo{" "}
                <strong>tutienda.com</strong>) para que tus clientes vean tu marca
                en la URL. Incluido en Pro, Business y Enterprise; con plan anual,
                el .com del primer año va incluido.
              </p>
              <Link
                href="/dashboard/planes"
                className="mt-3 inline-flex text-xs font-semibold text-teal-800 underline underline-offset-2 hover:text-teal-950 dark:text-teal-300 dark:hover:text-teal-100"
              >
                Ver planes →
              </Link>
            </div>
          </div>
        </div>
      ) : null}

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
