"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export type AdminStoresSubTab =
  | "usuarios"
  | "dominios"
  | "sucursales"
  | "promociones";

const SUB_TABS: Array<{ id: AdminStoresSubTab; label: string }> = [
  { id: "usuarios", label: "Usuarios y tiendas" },
  { id: "dominios", label: "Dominios" },
  { id: "sucursales", label: "Sucursales" },
  { id: "promociones", label: "Promociones" },
];

interface AdminStoresPanelProps {
  usuariosPanel: React.ReactNode;
  dominiosPanel: React.ReactNode;
  sucursalesPanel: React.ReactNode;
  promocionesPanel: React.ReactNode;
  initialSubTab?: AdminStoresSubTab;
}

export function AdminStoresPanel({
  usuariosPanel,
  dominiosPanel,
  sucursalesPanel,
  promocionesPanel,
  initialSubTab = "usuarios",
}: AdminStoresPanelProps) {
  const [subTab, setSubTab] = useState<AdminStoresSubTab>(initialSubTab);

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

      {subTab === "usuarios" ? usuariosPanel : null}
      {subTab === "dominios" ? dominiosPanel : null}
      {subTab === "sucursales" ? sucursalesPanel : null}
      {subTab === "promociones" ? promocionesPanel : null}
    </div>
  );
}
