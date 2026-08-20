"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export type AdminStoresSubTab =
  | "usuarios"
  | "catalogo"
  | "dominios"
  | "sucursales";

const SUB_TABS: Array<{ id: AdminStoresSubTab; label: string }> = [
  { id: "usuarios", label: "Usuarios y tiendas" },
  { id: "catalogo", label: "Catálogo" },
  { id: "dominios", label: "Dominios" },
  { id: "sucursales", label: "Sucursales" },
];

interface AdminStoresPanelProps {
  usuariosPanel: React.ReactNode;
  catalogoPanel: React.ReactNode;
  dominiosPanel: React.ReactNode;
  sucursalesPanel: React.ReactNode;
  initialSubTab?: AdminStoresSubTab;
}

export function AdminStoresPanel({
  usuariosPanel,
  catalogoPanel,
  dominiosPanel,
  sucursalesPanel,
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
      {subTab === "catalogo" ? catalogoPanel : null}
      {subTab === "dominios" ? dominiosPanel : null}
      {subTab === "sucursales" ? sucursalesPanel : null}
    </div>
  );
}
