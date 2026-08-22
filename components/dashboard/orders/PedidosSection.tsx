"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { OrdersPanel } from "@/components/dashboard/orders/OrdersPanel";
import { RegisterManualOrderModal } from "@/components/dashboard/orders/RegisterManualOrderModal";
import type { CatalogListItem } from "@/lib/database.types";
import type { CatalogOrder } from "@/lib/orders/types";
import type { MessageTemplatesSettings } from "@/lib/store-settings/types";
import type { StoreLocation } from "@/lib/locations/types";
import { sortOrdersByBusinessRules } from "@/lib/orders/order-status";

interface PedidosSectionProps {
  orders: CatalogOrder[];
  initialTotalCount: number;
  initialHasMore: boolean;
  storeName: string;
  messageTemplates: MessageTemplatesSettings;
  locations: StoreLocation[];
  catalogProducts: CatalogListItem[];
}

export function PedidosSection({
  orders: initialOrders,
  initialTotalCount,
  initialHasMore,
  storeName,
  messageTemplates,
  locations,
  catalogProducts,
}: PedidosSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [seedOrders, setSeedOrders] = useState(initialOrders);
  const [seedTotal, setSeedTotal] = useState(initialTotalCount);

  const handleCreated = useCallback((order: CatalogOrder) => {
    setSeedOrders((current) => sortOrdersByBusinessRules([order, ...current]));
    setSeedTotal((current) => current + 1);
  }, []);

  return (
    <>
      <DashboardPageHeader
        sectionLabel="Centro de operaciones"
        title="Pedidos"
        description={`Gestiona ventas, estados y clientes del catálogo público de ${storeName}. Toca un pedido para ver el detalle sin salir de la lista.`}
        actions={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn-brand min-h-10 gap-1.5 px-4 text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Registrar venta manual
          </button>
        }
      />

      <RegisterManualOrderModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        products={catalogProducts}
        onCreated={handleCreated}
      />

      <OrdersPanel
        orders={seedOrders}
        initialTotalCount={seedTotal}
        initialHasMore={initialHasMore}
        storeName={storeName}
        messageTemplates={messageTemplates}
        locations={locations}
      />
    </>
  );
}
