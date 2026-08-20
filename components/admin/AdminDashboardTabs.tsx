"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AdminDashboardShell } from "@/components/admin/AdminDashboardShell";
import { AdminStoresPanel } from "@/components/admin/AdminStoresPanel";
import { AdminAiAssistantPanel } from "@/components/admin/AdminAiAssistantPanel";
import { SupportMessagesPanel } from "@/components/dashboard/SupportMessagesPanel";
import type { AdminUserRow } from "@/lib/admin/get-admin-users";
import type { GrowthAuditEntry } from "@/lib/admin/growth-audit";
import type { SupportMessage } from "@/lib/database.types";
import type { AdminStoreDomainRow } from "@/lib/admin/custom-domain-actions";
import type { DropshipSettlementRecord } from "@/lib/dropship/settlement-types";
import {
  resolveAdminDashboardTab,
  resolveAdminStoresSubTab,
  type AdminDashboardTab,
} from "@/lib/admin/dashboard-nav";

export type { AdminDashboardTab };

const AdminGrowthPanel = dynamic(
  () =>
    import("@/components/admin/AdminGrowthPanel").then((m) => ({
      default: m.AdminGrowthPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cargando tiendas y usuarios…
      </p>
    ),
  },
);

const AdminCustomDomainsPanel = dynamic(
  () =>
    import("@/components/admin/AdminCustomDomainsPanel").then((m) => ({
      default: m.AdminCustomDomainsPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando dominios…</p>
    ),
  },
);

const AdminSupplierCatalogPanel = dynamic(
  () =>
    import("@/components/admin/AdminSupplierCatalogPanel").then((m) => ({
      default: m.AdminSupplierCatalogPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cargando catálogo mayorista…
      </p>
    ),
  },
);

const AdminStoreLocationsPanel = dynamic(
  () =>
    import("@/components/admin/AdminStoreLocationsPanel").then((m) => ({
      default: m.AdminStoreLocationsPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando sucursales…</p>
    ),
  },
);

const DropshipSettlementsPanel = dynamic(
  () =>
    import("@/components/admin/DropshipSettlementsPanel").then((m) => ({
      default: m.DropshipSettlementsPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cargando liquidaciones dropship…
      </p>
    ),
  },
);

interface AdminDashboardTabsProps {
  messages: SupportMessage[];
  growthUsers: AdminUserRow[];
  growthAuditLog: GrowthAuditEntry[];
  growthPlanFilter?: "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE" | "all";
  growthMinProducts?: number;
  messagesError?: string | null;
  growthError?: string | null;
  storeDomains?: AdminStoreDomainRow[];
  storeDomainsError?: string | null;
  assistantEnabled?: boolean;
  dropshipSettlements?: DropshipSettlementRecord[];
  dropshipSettlementsError?: string | null;
  pendingSupplierDrafts?: number;
  initialTab?: AdminDashboardTab | string;
  legacyTabParam?: string | null;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
      {message}
    </p>
  );
}

export function AdminDashboardTabs({
  messages,
  growthUsers,
  growthAuditLog,
  growthPlanFilter = "all",
  growthMinProducts,
  messagesError = null,
  growthError = null,
  storeDomains = [],
  storeDomainsError = null,
  assistantEnabled = false,
  dropshipSettlements = [],
  dropshipSettlementsError = null,
  pendingSupplierDrafts = 0,
  initialTab = "tiendas",
  legacyTabParam = null,
}: AdminDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<AdminDashboardTab>(() =>
    resolveAdminDashboardTab(
      typeof initialTab === "string" ? initialTab : initialTab,
    ),
  );
  const [supplierPanelMounted, setSupplierPanelMounted] = useState(
    () =>
      resolveAdminDashboardTab(
        typeof initialTab === "string" ? initialTab : initialTab,
      ) === "proveedor",
  );

  const pendingMessages = useMemo(
    () => messages.filter((item) => item.status === "pendiente").length,
    [messages],
  );

  const pendingSettlements = useMemo(
    () => dropshipSettlements.filter((item) => item.status === "reported").length,
    [dropshipSettlements],
  );

  const badgeCounts = {
    dropship: pendingSettlements,
    proveedor: pendingSupplierDrafts,
    soporte: pendingMessages,
  };

  function setTab(tab: AdminDashboardTab) {
    setActiveTab(tab);
    if (tab === "proveedor") setSupplierPanelMounted(true);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    params.delete("section");
    const query = params.toString();
    const nextUrl = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }

  const storesInitialSubTab = resolveAdminStoresSubTab(legacyTabParam);

  return (
    <AdminDashboardShell
      activeTab={activeTab}
      onTabChange={setTab}
      badgeCounts={badgeCounts}
    >
      {activeTab === "dropship" ? (
        dropshipSettlementsError ? (
          <ErrorBanner message={dropshipSettlementsError} />
        ) : (
          <DropshipSettlementsPanel initialSettlements={dropshipSettlements} />
        )
      ) : null}

      {supplierPanelMounted ? (
        <div hidden={activeTab !== "proveedor"}>
          <AdminSupplierCatalogPanel />
        </div>
      ) : null}

      {activeTab === "tiendas" ? (
        growthError ? (
          <ErrorBanner message={growthError} />
        ) : (
          <AdminStoresPanel
            initialSubTab={storesInitialSubTab}
            usuariosPanel={
              <AdminGrowthPanel
                initialUsers={growthUsers}
                initialAuditLog={growthAuditLog}
                initialPlanFilter={growthPlanFilter}
                initialMinProducts={growthMinProducts}
              />
            }
            dominiosPanel={
              storeDomainsError ? (
                <ErrorBanner message={storeDomainsError} />
              ) : (
                <AdminCustomDomainsPanel initialRows={storeDomains} />
              )
            }
            sucursalesPanel={<AdminStoreLocationsPanel />}
          />
        )
      ) : null}

      {activeTab === "soporte" ? (
        messagesError ? (
          <ErrorBanner message={messagesError} />
        ) : (
          <SupportMessagesPanel initialMessages={messages} />
        )
      ) : null}

      {activeTab === "ia" ? (
        <AdminAiAssistantPanel
          assistantEnabled={assistantEnabled}
          variant="full"
        />
      ) : null}
    </AdminDashboardShell>
  );
}
