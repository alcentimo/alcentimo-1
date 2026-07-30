import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { InventoryListSkeleton } from "@/components/dashboard/InventoryListSkeleton";

export default function CatalogoLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <DashboardPageHeader
        title="Catálogo"
        description="Gestiona lo que vendes: productos, fotos, precios y stock."
      />
      <InventoryListSkeleton rows={5} showReorderColumn={false} />
    </div>
  );
}
