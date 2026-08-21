"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { AdminStoresSubTab } from "@/lib/admin/dashboard-nav";

export type { AdminStoresSubTab };

const TABS: Array<{ id: AdminStoresSubTab; label: string }> = [
  { id: "proveedores", label: "Proveedores" },
  { id: "dropshippers", label: "Dropshippers" },
];

interface AdminStoresPanelProps {
  proveedoresPanel: React.ReactNode;
  dropshippersPanel: React.ReactNode;
  initialSubTab?: AdminStoresSubTab;
}

export function AdminStoresPanel({
  proveedoresPanel,
  dropshippersPanel,
  initialSubTab = "proveedores",
}: AdminStoresPanelProps) {
  const [subTab, setSubTab] = useState<AdminStoresSubTab>(initialSubTab);

  function selectSubTab(next: AdminStoresSubTab) {
    setSubTab(next);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "tiendas");
    if (next === "proveedores") params.delete("section");
    else params.set("section", next);
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${window.location.pathname}?${query}` : window.location.pathname,
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="admin-directory-tabs"
        role="tablist"
        aria-label="Gestión de usuarios"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            onClick={() => selectSubTab(tab.id)}
            className={cn(
              "admin-directory-tab",
              subTab === tab.id && "admin-directory-tab-active",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === "proveedores" ? proveedoresPanel : null}
      {subTab === "dropshippers" ? dropshippersPanel : null}
    </div>
  );
}
