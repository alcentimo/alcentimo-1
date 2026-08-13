"use client";

import { useEffect, useState } from "react";
import { CreditCard, Shield, UserRound, type LucideIcon } from "lucide-react";
import { AccountProfileTab } from "@/components/dashboard/account/AccountProfileTab";
import { AccountSecurityTab } from "@/components/dashboard/account/AccountSecurityTab";
import { AccountBillingTab } from "@/components/dashboard/account/AccountBillingTab";
import { SettingsMobileDropdown } from "@/components/dashboard/settings/SettingsMobileDropdown";
import type { AccountSettingsTab, AccountSnapshot } from "@/lib/account/types";
import { cn } from "@/lib/cn";

const VALID_ACCOUNT_TABS = new Set<AccountSettingsTab>([
  "perfil",
  "seguridad",
  "planes",
]);

function resolveInitialTab(
  tab: string | undefined,
  showBillingTab: boolean,
): AccountSettingsTab {
  if (tab === "seguridad") return "seguridad";
  if (tab === "planes" && showBillingTab) return "planes";
  return "perfil";
}

type NavItem = {
  id: AccountSettingsTab;
  label: string;
  icon: LucideIcon;
};

function buildAccountNavGroups(showBillingTab: boolean) {
  const groups: Array<{ label: string; items: NavItem[] }> = [
    {
      label: "Cuenta",
      items: [
        { id: "perfil", label: "Perfil", icon: UserRound },
        { id: "seguridad", label: "Seguridad", icon: Shield },
      ],
    },
  ];

  if (showBillingTab) {
    groups.push({
      label: "Suscripción",
      items: [{ id: "planes", label: "Planes y facturación", icon: CreditCard }],
    });
  }

  return groups;
}

interface AccountSettingsPanelProps {
  account: AccountSnapshot;
  initialTab?: string;
  showBillingTab?: boolean;
  canUpgradeToBusiness?: boolean;
  onNavigate?: () => void;
  onTabChange?: (tab: AccountSettingsTab) => void;
}

export function AccountSettingsPanel({
  account,
  initialTab,
  showBillingTab = false,
  canUpgradeToBusiness = false,
  onNavigate,
  onTabChange,
}: AccountSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<AccountSettingsTab>(() =>
    resolveInitialTab(initialTab, showBillingTab),
  );

  useEffect(() => {
    setActiveTab(resolveInitialTab(initialTab, showBillingTab));
  }, [initialTab, showBillingTab]);

  const navGroups = buildAccountNavGroups(showBillingTab);

  function renderActivePanel() {
    switch (activeTab) {
      case "perfil":
        return <AccountProfileTab account={account} />;
      case "seguridad":
        return <AccountSecurityTab account={account} />;
      case "planes":
        return (
          <AccountBillingTab
            account={account}
            canUpgradeToBusiness={canUpgradeToBusiness}
            onNavigate={onNavigate}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="settings-workspace">
      <SettingsMobileDropdown
        groups={navGroups}
        activeId={activeTab}
        onChange={(id) => {
          const next = id as AccountSettingsTab;
          setActiveTab(next);
          onTabChange?.(next);
        }}
        ariaLabel="Sección de cuenta"
      />

      <div className="settings-workspace-layout">
        <aside
          className="settings-sidebar settings-sidebar--desktop"
          aria-label="Secciones de cuenta"
        >
          <nav className="settings-sidebar-nav">
            {navGroups.map((group) => (
              <div key={group.label} className="settings-sidebar-group">
                <p className="settings-sidebar-group-label">{group.label}</p>
                <ul className="settings-sidebar-list">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            onTabChange?.(item.id);
                          }}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "settings-sidebar-link",
                            isActive && "settings-sidebar-link-active",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div
          className="settings-workspace-body"
          role="region"
          aria-label="Contenido de cuenta personal"
        >
          {renderActivePanel()}
        </div>
      </div>
    </div>
  );
}
