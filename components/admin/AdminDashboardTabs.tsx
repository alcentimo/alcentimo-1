"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminDashboardShell } from "@/components/admin/AdminDashboardShell";
import { AdminStoresPanel } from "@/components/admin/AdminStoresPanel";
import { AdminAiAssistantPanel } from "@/components/admin/AdminAiAssistantPanel";
import { SupportMessagesPanel } from "@/components/dashboard/SupportMessagesPanel";
import type { AdminUserRow } from "@/lib/admin/get-admin-users";
import type { AdminSupplierDirectoryRow } from "@/lib/admin/get-admin-suppliers";
import type { SupportMessage } from "@/lib/database.types";
import type { DropshipSettlementRecord } from "@/lib/dropship/settlement-types";
import type { PlatformDropshipShippingSettings } from "@/lib/platform/dropship-shipping";
import {
  resolveAdminDashboardTab,
  resolveAdminStoresSubTab,
  type AdminDashboardTab,
} from "@/lib/admin/dashboard-nav";

export type { AdminDashboardTab };

const AdminDropshippersDirectoryPanel = dynamic(
  () =>
    import("@/components/admin/AdminDropshippersDirectoryPanel").then((m) => ({
      default: m.AdminDropshippersDirectoryPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cargando dropshippers…
      </p>
    ),
  },
);

const AdminSuppliersDirectoryPanel = dynamic(
  () =>
    import("@/components/admin/AdminSuppliersDirectoryPanel").then((m) => ({
      default: m.AdminSuppliersDirectoryPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cargando proveedores…
      </p>
    ),
  },
);

const AdminSupplierPickupPanel = dynamic(
  () =>
    import("@/components/admin/AdminSupplierPickupPanel").then((m) => ({
      default: m.AdminSupplierPickupPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cargando recolección B2B…
      </p>
    ),
  },
);

const AdminOfficialBrandsPanel = dynamic(
  () =>
    import("@/components/admin/AdminOfficialBrandsPanel").then((m) => ({
      default: m.AdminOfficialBrandsPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cargando marcas destacadas…
      </p>
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

const AdminShippingPanel = dynamic(
  () =>
    import("@/components/admin/AdminShippingPanel").then((m) => ({
      default: m.AdminShippingPanel,
    })),
  {
    loading: () => (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Cargando configuración de envíos…
      </p>
    ),
  },
);

interface AdminDashboardTabsProps {
  messages: SupportMessage[];
  dropshippers: AdminUserRow[];
  suppliers: AdminSupplierDirectoryRow[];
  messagesError?: string | null;
  dropshippersError?: string | null;
  suppliersError?: string | null;
  assistantEnabled?: boolean;
  dropshipSettlements?: DropshipSettlementRecord[];
  dropshipSettlementsError?: string | null;
  pendingSupplierDrafts?: number;
  dropshipShipping: PlatformDropshipShippingSettings;
  initialTab?: AdminDashboardTab | string;
  legacyTabParam?: string | null;
  initialStoresSection?: string | null;
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
  dropshippers,
  suppliers,
  messagesError = null,
  dropshippersError = null,
  suppliersError = null,
  assistantEnabled = false,
  dropshipSettlements = [],
  dropshipSettlementsError = null,
  pendingSupplierDrafts = 0,
  dropshipShipping,
  initialTab = "tiendas",
  legacyTabParam = null,
  initialStoresSection = null,
}: AdminDashboardTabsProps) {
  const router = useRouter();
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
    if (tab === "tienda") {
      router.push("/admin/tienda/catalogo");
      return;
    }
    setActiveTab(tab);
    if (tab === "proveedor") setSupplierPanelMounted(true);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    if (tab !== "tiendas") params.delete("section");
    const query = params.toString();
    const nextUrl = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }

  const storesInitialSubTab = resolveAdminStoresSubTab(
    legacyTabParam,
    initialStoresSection,
  );

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
          <AdminSupplierPickupPanel />
          <AdminSupplierCatalogPanel />
        </div>
      ) : null}

      {activeTab === "marcas" ? <AdminOfficialBrandsPanel /> : null}

      {activeTab === "tiendas" ? (
        <AdminStoresPanel
          initialSubTab={storesInitialSubTab}
          proveedoresPanel={
            suppliersError ? (
              <ErrorBanner message={suppliersError} />
            ) : (
              <AdminSuppliersDirectoryPanel initialSuppliers={suppliers} />
            )
          }
          dropshippersPanel={
            dropshippersError ? (
              <ErrorBanner message={dropshippersError} />
            ) : (
              <AdminDropshippersDirectoryPanel initialUsers={dropshippers} />
            )
          }
        />
      ) : null}

      {activeTab === "envios" ? (
        <AdminShippingPanel initialShipping={dropshipShipping} />
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
