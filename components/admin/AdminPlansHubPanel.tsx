"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { AdminPlansSubTab } from "@/lib/admin/dashboard-nav";

const SUB_TABS: Array<{ id: AdminPlansSubTab; label: string }> = [
  { id: "planes", label: "Planes y límites" },
  { id: "pagos-config", label: "Métodos de pago" },
  { id: "plataforma", label: "Marca y plataforma" },
];

interface AdminPlansHubPanelProps {
  planesPanel: React.ReactNode;
  pagosConfigPanel: React.ReactNode;
  plataformaPanel: React.ReactNode;
  initialSubTab?: AdminPlansSubTab;
}

export function AdminPlansHubPanel({
  planesPanel,
  pagosConfigPanel,
  plataformaPanel,
  initialSubTab = "planes",
}: AdminPlansHubPanelProps) {
  const [subTab, setSubTab] = useState<AdminPlansSubTab>(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  function setPlansSubTab(nextTab: AdminPlansSubTab) {
    setSubTab(nextTab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "planes");
    params.set("section", nextTab);
    const query = params.toString();
    const nextUrl = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }

  return (
    <div className="space-y-4">
      <div className="admin-subnav">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPlansSubTab(tab.id)}
            className={cn(
              "admin-subnav-item",
              subTab === tab.id && "admin-subnav-item-active",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === "planes" ? planesPanel : null}
      {subTab === "pagos-config" ? pagosConfigPanel : null}
      {subTab === "plataforma" ? plataformaPanel : null}
    </div>
  );
}
