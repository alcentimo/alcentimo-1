"use client";

import { useEffect, useState, useTransition } from "react";
import type { ProductEditData } from "@/lib/products/actions";
import { getProductForEdit } from "@/lib/products/actions";
import type { Store } from "@/lib/database.types";
import { ProductCatalogForm } from "@/components/dashboard/ProductCatalogForm";
import { QuickProductForm, type PublishedProductResult } from "@/components/dashboard/QuickProductForm";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: Store;
  exchangeRate: number | null;
  productFormConfig: StoreProductFormConfig;
  mode: "create" | "edit";
  productId?: string;
  onSaved: (result?: PublishedProductResult) => void;
  onLimitHit?: () => void;
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
  onLimitHit,
}: ProductFormSheetProps) {
  const [editData, setEditData] = useState<ProductEditData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startTransition] = useTransition();
  const [createFormKey, setCreateFormKey] = useState(0);

  useEffect(() => {
    if (!open) {
      setEditData(null);
      setLoadError(null);
      return;
    }

    if (mode === "create") {
      setCreateFormKey((key) => key + 1);
      return;
    }

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

  function handleCreateComplete(result?: PublishedProductResult) {
    onSaved(result);
    onOpenChange(false);
  }

  if (mode === "create") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onClose={() => onOpenChange(false)}
          className="relative max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Nuevo producto</DialogTitle>
            <DialogDescription>
              Nombre, precio en Bs y foto. Lo demás queda en opciones avanzadas.
            </DialogDescription>
          </DialogHeader>

          {open && (
            <QuickProductForm
              key={createFormKey}
              store={store}
              exchangeRate={exchangeRate}
              productFormConfig={productFormConfig}
              onComplete={handleCreateComplete}
              onRefresh={onSaved}
              onCancel={() => onOpenChange(false)}
              onLimitHit={onLimitHit}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onClose={() => onOpenChange(false)}
        className="max-w-md sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>Editar producto</SheetTitle>
          <SheetDescription>
            Actualiza los datos y guarda sin salir del catálogo.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {loading && (
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

          {editData && !loading && (
            <ProductCatalogForm
              key={editData.productId}
              store={store}
              exchangeRate={exchangeRate}
              productFormConfig={productFormConfig}
              mode="edit"
              initialData={editData}
              onSuccess={() => {
                onSaved();
                onOpenChange(false);
              }}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
