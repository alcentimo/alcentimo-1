"use client";

import Link from "next/link";
import { ArrowUpRight, CreditCard } from "lucide-react";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import type { AccountSnapshot } from "@/lib/account/types";
import { DASHBOARD_PLANS_HREF } from "@/src/config/plans";

interface AccountBillingTabProps {
  account: AccountSnapshot;
  canUpgradeToBusiness?: boolean;
  onNavigate?: () => void;
}

function BillingLinkCard({
  href,
  title,
  description,
  icon: Icon,
  onNavigate,
}: {
  href: string;
  title: string;
  description: string;
  icon: typeof CreditCard;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {description}
        </span>
      </span>
      <ArrowUpRight
        className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
        aria-hidden="true"
      />
    </Link>
  );
}

export function AccountBillingTab({
  account,
  canUpgradeToBusiness = false,
  onNavigate,
}: AccountBillingTabProps) {
  return (
    <SettingsTabShell hideSaveBar>
      <SettingsSection
        title="Plan actual"
        description="Resumen de tu suscripción en Alcentimo."
        variant="payments"
      >
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {account.planName}
          </p>
          {account.storeName ? (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Tienda: {account.storeName}
            </p>
          ) : null}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Facturación"
        description="Gestiona pagos y cambios de plan."
        variant="payments"
      >
        <div className="grid gap-3">
          <BillingLinkCard
            href={DASHBOARD_PLANS_HREF}
            title="Planes y facturación"
            description="Compara planes, revisa pagos y administra tu suscripción."
            icon={CreditCard}
            onNavigate={onNavigate}
          />
          {canUpgradeToBusiness ? (
            <BillingLinkCard
              href="/dashboard/upgrade"
              title="Upgrade a Business"
              description="Pasa a Business con prorrateo y más capacidad para tu equipo."
              icon={ArrowUpRight}
              onNavigate={onNavigate}
            />
          ) : null}
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
