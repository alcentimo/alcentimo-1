"use client";

import { useEffect, useState } from "react";
import type { ProductEditData } from "@/lib/products/actions";
import { getProductForEdit } from "@/lib/products/actions";
import { fetchStoreProductFormConfig } from "@/lib/products/fetch-store-product-form-config";
import type { Store } from "@/lib/database.types";
import { ProductCatalogForm } from "@/components/dashboard/ProductCatalogForm";
import {
  QuickProductForm,
  type PublishedProductResult,
} from "@/components/dashboard/QuickProductForm";
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
  const [editLoading, setEditLoading] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [liveFormConfig, setLiveFormConfig] =
    useState<StoreProductFormConfig>(productFormConfig);

  useEffect(() => {
    setLiveFormConfig(productFormConfig);
  }, [productFormConfig]);

  useEffect(() => {
    if (!open) {
      setEditData(null);
      setLoadError(null);
      setEditLoading(false);
      return;
    }

    if (mode === "create") {
      setCreateFormKey((key) => key + 1);
    }

    let cancelled = false;

    void fetchStoreProductFormConfig().then((configResult) => {
      if (cancelled || !configResult.config) return;
      setLiveFormConfig(configResult.config);
    });

    return () => {
      cancelled = true;
    };
  }, [open, mode]);

  useEffect(() => {
    if (!open || mode !== "edit") return;

    if (!productId) {
      setLoadError("Producto no válido.");
      setEditData(null);
      setEditLoading(false);
      return;
    }

    let cancelled = false;
    setEditLoading(true);
    setLoadError(null);
    setEditData(null);

    void getProductForEdit(productId).then((data) => {
      if (cancelled) return;
      setEditLoading(false);
      if (!data) {
        setLoadError("No se pudo cargar el producto.");
        return;
      }
      setEditData(data);
    });

    return () => {
      cancelled = true;
    };
  }, [open, mode, productId]);

  function handleCreateComplete(result?: PublishedProductResult) {
    onSaved(result);
    onOpenChange(false);
  }

  const editBusy = mode === "edit" && open && editLoading;

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
              Nombre, precio en dólares y foto. Lo demás queda en opciones avanzadas.
              {liveFormConfig.rubroLabel
                ? ` Rubro: ${liveFormConfig.rubroLabel}.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <QuickProductForm
            key={`${createFormKey}-${liveFormConfig.rubroTienda}`}
            store={store}
            exchangeRate={exchangeRate}
            productFormConfig={liveFormConfig}
            onComplete={handleCreateComplete}
            onRefresh={onSaved}
            onCancel={() => onOpenChange(false)}
            onLimitHit={onLimitHit}
          />
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
          {editBusy && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Cargando producto…
            </div>
          )}

          {loadError && !editBusy ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {loadError}
            </p>
          ) : null}

          {editData && !editBusy ? (
            <ProductCatalogForm
              key={`${editData.productId}-${liveFormConfig.rubroTienda}`}
              store={store}
              exchangeRate={exchangeRate}
              productFormConfig={liveFormConfig}
              mode="edit"
              initialData={editData}
              onSuccess={() => {
                onSaved();
                onOpenChange(false);
              }}
              onCancel={() => onOpenChange(false)}
            />
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
