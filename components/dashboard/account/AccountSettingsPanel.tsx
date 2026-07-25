"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shield, UserRound } from "lucide-react";
import { AccountProfileTab } from "@/components/dashboard/account/AccountProfileTab";
import { AccountSecurityTab } from "@/components/dashboard/account/AccountSecurityTab";
import type { AccountSettingsTab, AccountSnapshot } from "@/lib/account/types";
import { cn } from "@/lib/cn";

const ACCOUNT_TABS: Array<{
  id: AccountSettingsTab;
  label: string;
  icon: typeof UserRound;
}> = [
  { id: "perfil", label: "Perfil", icon: UserRound },
  { id: "seguridad", label: "Seguridad", icon: Shield },
];

function resolveInitialTab(tab: string | undefined): AccountSettingsTab {
  if (tab === "seguridad") return "seguridad";
  return "perfil";
}

interface AccountSettingsPanelProps {
  account: AccountSnapshot;
  initialTab?: string;
}

export function AccountSettingsPanel({
  account,
  initialTab,
}: AccountSettingsPanelProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AccountSettingsTab>(() =>
    resolveInitialTab(initialTab),
  );

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") ?? initialTab;
    setActiveTab(resolveInitialTab(tabFromUrl ?? undefined));
  }, [searchParams, initialTab]);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav
        className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible"
        aria-label="Secciones de cuenta"
      >
        {ACCOUNT_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex min-w-[9rem] items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors lg:w-full",
                active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : "border-transparent text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0">
        {activeTab === "perfil" ? (
          <AccountProfileTab account={account} />
        ) : (
          <AccountSecurityTab account={account} />
        )}
      </div>
    </div>
  );
}
