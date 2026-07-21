"use client";

import { useEffect, useLayoutEffect, useState, useTransition } from "react";
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
  const [loading, startTransition] = useTransition();
  const [createFormKey, setCreateFormKey] = useState(0);
  const [liveFormConfig, setLiveFormConfig] =
    useState<StoreProductFormConfig>(productFormConfig);
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    setLiveFormConfig(productFormConfig);
  }, [productFormConfig]);

  useLayoutEffect(() => {
    if (!open) {
      setConfigReady(false);
      setEditData(null);
      setLoadError(null);
      return;
    }
    setConfigReady(false);
  }, [open, mode, productId]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadError(null);

    startTransition(async () => {
      const configResult = await fetchStoreProductFormConfig();
      if (cancelled) return;

      if (configResult.config) {
        setLiveFormConfig(configResult.config);
      } else {
        setLiveFormConfig(productFormConfig);
      }

      if (mode === "create") {
        setCreateFormKey((key) => key + 1);
        setConfigReady(true);
        return;
      }

      if (!productId) {
        setLoadError("Producto no válido.");
        setConfigReady(true);
        return;
      }

      const data = await getProductForEdit(productId);
      if (cancelled) return;

      if (!data) {
        setLoadError("No se pudo cargar el producto.");
        setConfigReady(true);
        return;
      }

      setEditData(data);
      setConfigReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [open, mode, productId, productFormConfig]);

  function handleCreateComplete(result?: PublishedProductResult) {
    onSaved(result);
    onOpenChange(false);
  }

  const formBusy = open && (!configReady || loading);

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
              {configReady && liveFormConfig.rubroLabel
                ? ` Rubro: ${liveFormConfig.rubroLabel}.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {formBusy ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Cargando campos del rubro…
            </div>
          ) : (
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
          {formBusy && (
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

          {editData && !formBusy && (
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
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
