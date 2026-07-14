"use client";

import { useEffect, useState, useTransition } from "react";
import type { ProductEditData } from "@/lib/products/actions";
import { getProductForEdit } from "@/lib/products/actions";
import type { Store } from "@/lib/database.types";
import { ProductCatalogForm } from "@/components/dashboard/ProductCatalogForm";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: Store;
  exchangeRate: number | null;
  productFormConfig: StoreProductFormConfig;
  mode: "create" | "edit";
  productId?: string;
  onSaved: () => void;
}

export function ProductFormSheet({
  open,
  onOpenChange,
  store,
  exchangeRate,
  productFormConfig,
  mode,
  productId,
  onSaved,
}: ProductFormSheetProps) {
  const [editData, setEditData] = useState<ProductEditData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setEditData(null);
      setLoadError(null);
      return;
    }

    if (mode === "create") return;

    if (!productId) {
      setLoadError("Producto no válido.");
      return;
    }

    startTransition(async () => {
      const data = await getProductForEdit(productId);
      if (!data) {
        setLoadError("No se pudo cargar el producto.");
        return;
      }
      setEditData(data);
    });
  }, [open, mode, productId]);

  function handleSuccess() {
    onSaved();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onClose={() => onOpenChange(false)}>
        <SheetHeader>
          <SheetTitle>{mode === "edit" ? "Editar producto" : "Nuevo producto"}</SheetTitle>
          <SheetDescription>
            {mode === "edit"
              ? "Actualiza los datos y guarda sin salir del catálogo."
              : "Publica un producto en tu catálogo público."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {mode === "edit" && loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Cargando producto…
            </div>
          )}

          {loadError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {loadError}
            </p>
          )}

          {mode === "create" && open && (
            <ProductCatalogForm
              key="create"
              store={store}
              exchangeRate={exchangeRate}
              productFormConfig={productFormConfig}
              mode="create"
              onSuccess={handleSuccess}
              onCancel={() => onOpenChange(false)}
            />
          )}

          {mode === "edit" && editData && !loading && (
            <ProductCatalogForm
              key={editData.productId}
              store={store}
              exchangeRate={exchangeRate}
              productFormConfig={productFormConfig}
              mode="edit"
              initialData={editData}
              onSuccess={handleSuccess}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
