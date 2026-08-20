"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { AdminStoresSubTab } from "@/lib/admin/dashboard-nav";

export type { AdminStoresSubTab };

const CLASSIFICATION_TABS: Array<{ id: AdminStoresSubTab; label: string }> = [
  { id: "dropshippers", label: "Dropshippers" },
  { id: "proveedores", label: "Proveedores" },
];

const STORE_TABS: Array<{ id: AdminStoresSubTab; label: string }> = [
  { id: "dominios", label: "Dominios" },
  { id: "sucursales", label: "Sucursales" },
];

interface AdminStoresPanelProps {
  dropshippersPanel: React.ReactNode;
  proveedoresPanel: React.ReactNode;
  dominiosPanel: React.ReactNode;
  sucursalesPanel: React.ReactNode;
  initialSubTab?: AdminStoresSubTab;
}

export function AdminStoresPanel({
  dropshippersPanel,
  proveedoresPanel,
  dominiosPanel,
  sucursalesPanel,
  initialSubTab = "dropshippers",
}: AdminStoresPanelProps) {
  const [subTab, setSubTab] = useState<AdminStoresSubTab>(initialSubTab);

  function selectSubTab(next: AdminStoresSubTab) {
    setSubTab(next);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "tiendas");
    if (next === "dropshippers") params.delete("section");
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
      <div className="admin-subnav" role="tablist" aria-label="Directorio de la comunidad">
        {CLASSIFICATION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            onClick={() => selectSubTab(tab.id)}
            className={cn(
              "admin-subnav-item",
              subTab === tab.id && "admin-subnav-item-active",
            )}
          >
            {tab.label}
          </button>
        ))}
        <span className="admin-subnav-divider" aria-hidden="true" />
        {STORE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            onClick={() => selectSubTab(tab.id)}
            className={cn(
              "admin-subnav-item",
              subTab === tab.id && "admin-subnav-item-active",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === "dropshippers" ? dropshippersPanel : null}
      {subTab === "proveedores" ? proveedoresPanel : null}
      {subTab === "dominios" ? dominiosPanel : null}
      {subTab === "sucursales" ? sucursalesPanel : null}
    </div>
  );
}
