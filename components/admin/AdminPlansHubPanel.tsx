"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type AdminPlansSubTab = "planes" | "pagos-config" | "plataforma";

const SUB_TABS: Array<{ id: AdminPlansSubTab; label: string }> = [
  { id: "planes", label: "Planes y límites" },
  { id: "pagos-config", label: "Métodos de pago" },
  { id: "plataforma", label: "Marca y plataforma" },
];

interface AdminPlansHubPanelProps {
  planesPanel: React.ReactNode;
  pagosConfigPanel: React.ReactNode;
  plataformaPanel: React.ReactNode;
}

export function AdminPlansHubPanel({
  planesPanel,
  pagosConfigPanel,
  plataformaPanel,
}: AdminPlansHubPanelProps) {
  const [subTab, setSubTab] = useState<AdminPlansSubTab>("planes");

  return (
    <div className="space-y-4">
      <div className="admin-subnav">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
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
