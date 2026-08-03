"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import {
  Boxes,
  CircleAlert,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { ProductImageField } from "@/components/dashboard/ProductImageField";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  archiveSupplierProduct,
  createSupplierProduct,
  updateSupplierProduct,
  type SupplierProduct,
} from "@/lib/supplier/actions";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

interface SupplierProductsPanelProps {
  initialProducts: SupplierProduct[];
}

type ProductFormState = {
  title: string;
  description: string;
  stock: string;
  basePriceUsd: string;
  imageFile: File | null;
  imageKey: number;
};

const EMPTY_FORM: Omit<ProductFormState, "imageKey"> = {
  title: "",
  description: "",
  stock: "0",
  basePriceUsd: "",
  imageFile: null,
};

function formFromProduct(product: SupplierProduct): ProductFormState {
  return {
    title: product.title,
    description: product.description,
    stock: String(product.stock),
    basePriceUsd: String(product.basePriceUsd),
    imageFile: null,
    imageKey: Date.now(),
  };
}

function buildFormData(form: ProductFormState): FormData {
  const formData = new FormData();
  formData.set("title", form.title);
  formData.set("description", form.description);
  formData.set("stock", form.stock);
  formData.set("basePriceUsd", form.basePriceUsd);
  if (form.imageFile) {
    formData.set("image", form.imageFile);
  }
  return formData;
}

export function SupplierProductsPanel({
  initialProducts,
}: SupplierProductsPanelProps) {
  const [products, setProducts] = useState(initialProducts);
  const [createForm, setCreateForm] = useState<ProductFormState>({
    ...EMPTY_FORM,
    imageKey: 0,
  });
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(
    null,
  );
  const [editForm, setEditForm] = useState<ProductFormState | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
    const inventoryValueUsd = products.reduce(
      (sum, product) => sum + product.stock * product.basePriceUsd,
      0,
    );
    const outOfStock = products.filter((product) => product.stock <= 0).length;
    return { totalProducts, totalStock, inventoryValueUsd, outOfStock };
  }, [products]);

  const editOpen = Boolean(editingProduct && editForm);

  function resetCreateForm() {
    setCreateForm({
      ...EMPTY_FORM,
      imageKey: Date.now(),
    });
    setCreateError(null);
  }

  function closeEditModal() {
    setEditingProduct(null);
    setEditForm(null);
    setEditError(null);
  }

  function startEdit(product: SupplierProduct) {
    setEditingProduct(product);
    setEditForm(formFromProduct(product));
    setEditError(null);
    setListMessage(null);
    setCreateMessage(null);
  }

  function handleCreate() {
    setCreateError(null);
    setCreateMessage(null);
    setListMessage(null);

    startTransition(async () => {
      const result = await createSupplierProduct(buildFormData(createForm));
      if (result.error || !result.product) {
        setCreateError(result.error ?? "No se pudo crear el producto.");
        return;
      }
      setProducts((current) => [result.product!, ...current]);
      setCreateMessage("Producto cargado.");
      resetCreateForm();
    });
  }

  function handleSaveEdit() {
    if (!editingProduct || !editForm) return;
    setEditError(null);
    setListMessage(null);

    startTransition(async () => {
      const result = await updateSupplierProduct(
        editingProduct.id,
        buildFormData(editForm),
      );
      if (result.error || !result.product) {
        setEditError(result.error ?? "No se pudo actualizar.");
        return;
      }
      const updated = result.product;
      setProducts((current) =>
        current.map((product) =>
          product.id === updated.id ? updated : product,
        ),
      );
      setListMessage("Producto actualizado.");
      closeEditModal();
    });
  }

  function handleArchive(productId: string) {
    setCreateError(null);
    setCreateMessage(null);
    setListMessage(null);
    startTransition(async () => {
      const result = await archiveSupplierProduct(productId);
      if (result.error) {
        setListMessage(null);
        setCreateError(result.error);
        return;
      }
      setProducts((current) =>
        current.filter((product) => product.id !== productId),
      );
      if (editingProduct?.id === productId) closeEditModal();
      setListMessage("Producto archivado.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="supplier-hub-metrics" aria-label="Resumen de productos">
        <div className="supplier-hub-metric">
          <span className="supplier-hub-metric-icon" aria-hidden="true">
            <Package className="h-4 w-4" />
          </span>
          <div>
            <p className="supplier-hub-metric-label">Productos cargados</p>
            <p className="supplier-hub-metric-value">{metrics.totalProducts}</p>
          </div>
        </div>
        <div className="supplier-hub-metric">
          <span className="supplier-hub-metric-icon" aria-hidden="true">
            <Boxes className="h-4 w-4" />
          </span>
          <div>
            <p className="supplier-hub-metric-label">Stock global</p>
            <p className="supplier-hub-metric-value">
              {metrics.totalStock.toLocaleString("es")}
            </p>
          </div>
        </div>
        <div className="supplier-hub-metric">
          <span className="supplier-hub-metric-icon" aria-hidden="true">
            <Wallet className="h-4 w-4" />
          </span>
          <div>
            <p className="supplier-hub-metric-label">Valor inventario</p>
            <p className="supplier-hub-metric-value">
              {formatUsd(metrics.inventoryValueUsd)}
            </p>
          </div>
        </div>
        <div className="supplier-hub-metric">
          <span className="supplier-hub-metric-icon" aria-hidden="true">
            <CircleAlert className="h-4 w-4" />
          </span>
          <div>
            <p className="supplier-hub-metric-label">Sin stock</p>
            <p className="supplier-hub-metric-value">{metrics.outOfStock}</p>
          </div>
        </div>
      </div>

      <section className="supplier-hub-card">
        <div className="supplier-hub-card-header">
          <div>
            <p className="supplier-hub-section-label">Catálogo mayorista</p>
            <h1 className="supplier-hub-heading">Cargar producto</h1>
            <p className="supplier-hub-subheading">
              Añade un producto nuevo al hub. Para modificar uno existente, usa
              Editar en la lista.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <ProductImageField
            key={createForm.imageKey}
            id="supplier-product-image"
            mode="create"
            layout="compact"
            initialPreviewUrl={null}
            disabled={pending}
            onImageReady={({ file }) => {
              setCreateForm((current) => ({ ...current, imageFile: file }));
            }}
            onError={(msg) => setCreateError(msg)}
          />

          <div className="space-y-3">
            <div>
              <label htmlFor="supplier-title" className="label-field">
                Título
              </label>
              <input
                id="supplier-title"
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="input-field"
                placeholder="Ej: Caja mayorista de snacks"
                disabled={pending}
              />
            </div>
            <div>
              <label htmlFor="supplier-description" className="label-field">
                Descripción
              </label>
              <textarea
                id="supplier-description"
                rows={4}
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="input-field resize-none"
                placeholder="Detalles para el comerciante (contenido, presentación, condiciones…)"
                disabled={pending}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="supplier-stock" className="label-field">
                  Stock
                </label>
                <input
                  id="supplier-stock"
                  type="number"
                  min={0}
                  step={1}
                  value={createForm.stock}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      stock: event.target.value,
                    }))
                  }
                  className="input-field"
                  disabled={pending}
                />
              </div>
              <div>
                <label htmlFor="supplier-price" className="label-field">
                  Precio base (USD)
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
                    $
                  </span>
                  <input
                    id="supplier-price"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={createForm.basePriceUsd}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        basePriceUsd: event.target.value,
                      }))
                    }
                    className="input-field !mt-0 pl-7"
                    placeholder="0.00"
                    disabled={pending}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {createError ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {createError}
          </p>
        ) : null}
        {createMessage ? (
          <p className="supplier-hub-success mt-4">{createMessage}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-brand"
            onClick={handleCreate}
            disabled={pending}
          >
            {pending && !editOpen ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Publicar en hub
          </button>
        </div>
      </section>

      <section>
        <p className="supplier-hub-section-label">
          Productos cargados ({products.length})
        </p>
        {listMessage ? (
          <p className="supplier-hub-success mt-2">{listMessage}</p>
        ) : null}
        {products.length === 0 ? (
          <p className="supplier-hub-empty mt-3">
            Aún no hay productos. Usa el formulario de arriba para cargar el
            primero.
          </p>
        ) : (
          <ul className="supplier-hub-list mt-3">
            {products.map((product) => (
              <li
                key={product.id}
                className={cn(
                  "supplier-hub-list-item",
                  editingProduct?.id === product.id &&
                    "supplier-hub-list-item-active",
                )}
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-emerald-50 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:ring-emerald-900/50">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                      Sin foto
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {product.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                    {product.description || "Sin descripción"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatUsd(product.basePriceUsd)} · Stock {product.stock}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="btn-brand-outline !min-h-8 !gap-1.5 !px-2.5 !text-xs"
                    disabled={pending}
                    onClick={() => startEdit(product)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                  <button
                    type="button"
                    className="btn-brand-outline !min-h-8 !gap-1.5 !px-2.5 !text-xs"
                    disabled={pending}
                    onClick={() => handleArchive(product.id)}
                    aria-label="Archivar"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) closeEditModal();
        }}
        containerClassName="max-w-2xl"
      >
        <DialogContent
          className="relative max-h-[90vh] overflow-y-auto border-emerald-200/70 p-5 shadow-[0_16px_48px_rgba(5,150,105,0.12)] sm:p-6 dark:border-emerald-900/40"
          onClose={closeEditModal}
        >
          <DialogHeader>
            <p className="supplier-hub-section-label">Edición</p>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription>
              Actualiza título, descripción, stock, precio o foto. Los cambios se
              guardan en Supabase al confirmar.
            </DialogDescription>
          </DialogHeader>

          {editForm && editingProduct ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-5 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
                <ProductImageField
                  key={editForm.imageKey}
                  id="supplier-edit-product-image"
                  mode="edit"
                  layout="compact"
                  initialPreviewUrl={editingProduct.imageUrl}
                  disabled={pending}
                  onImageReady={({ file }) => {
                    setEditForm((current) =>
                      current ? { ...current, imageFile: file } : current,
                    );
                  }}
                  onError={(msg) => setEditError(msg)}
                />

                <div className="space-y-3">
                  <div>
                    <label htmlFor="supplier-edit-title" className="label-field">
                      Título
                    </label>
                    <input
                      id="supplier-edit-title"
                      value={editForm.title}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? { ...current, title: event.target.value }
                            : current,
                        )
                      }
                      className="input-field"
                      disabled={pending}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="supplier-edit-description"
                      className="label-field"
                    >
                      Descripción
                    </label>
                    <textarea
                      id="supplier-edit-description"
                      rows={4}
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm((current) =>
                          current
                            ? { ...current, description: event.target.value }
                            : current,
                        )
                      }
                      className="input-field resize-none"
                      disabled={pending}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="supplier-edit-stock" className="label-field">
                        Stock
                      </label>
                      <input
                        id="supplier-edit-stock"
                        type="number"
                        min={0}
                        step={1}
                        value={editForm.stock}
                        onChange={(event) =>
                          setEditForm((current) =>
                            current
                              ? { ...current, stock: event.target.value }
                              : current,
                          )
                        }
                        className="input-field"
                        disabled={pending}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="supplier-edit-price"
                        className="label-field"
                      >
                        Precio base (USD)
                      </label>
                      <div className="relative mt-1.5">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
                          $
                        </span>
                        <input
                          id="supplier-edit-price"
                          type="number"
                          min={0}
                          step="0.01"
                          inputMode="decimal"
                          value={editForm.basePriceUsd}
                          onChange={(event) =>
                            setEditForm((current) =>
                              current
                                ? {
                                    ...current,
                                    basePriceUsd: event.target.value,
                                  }
                                : current,
                            )
                          }
                          className="input-field !mt-0 pl-7"
                          disabled={pending}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {editError ? (
                <p className="text-sm text-red-600" role="alert">
                  {editError}
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 border-t border-emerald-100 pt-4 dark:border-emerald-900/40">
                <button
                  type="button"
                  className="btn-brand-outline !min-h-10 !px-4 !text-sm"
                  onClick={closeEditModal}
                  disabled={pending}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-brand !min-h-10"
                  onClick={handleSaveEdit}
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  Guardar cambios
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
