"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { ProductImageField } from "@/components/dashboard/ProductImageField";
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

type FormMode = "create" | "edit";

export function SupplierProductsPanel({
  initialProducts,
}: SupplierProductsPanelProps) {
  const [products, setProducts] = useState(initialProducts);
  const [mode, setMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("0");
  const [basePriceUsd, setBasePriceUsd] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageKey, setImageKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editingProduct = useMemo(
    () => products.find((product) => product.id === editingId) ?? null,
    [products, editingId],
  );

  function resetForm() {
    setMode("create");
    setEditingId(null);
    setTitle("");
    setDescription("");
    setStock("0");
    setBasePriceUsd("");
    setImageFile(null);
    setImageKey((value) => value + 1);
    setError(null);
  }

  function startEdit(product: SupplierProduct) {
    setMode("edit");
    setEditingId(product.id);
    setTitle(product.title);
    setDescription(product.description);
    setStock(String(product.stock));
    setBasePriceUsd(String(product.basePriceUsd));
    setImageFile(null);
    setImageKey((value) => value + 1);
    setError(null);
    setMessage(null);
  }

  function handleSubmit() {
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("stock", stock);
    formData.set("basePriceUsd", basePriceUsd);
    if (imageFile) {
      formData.set("image", imageFile);
    }

    startTransition(async () => {
      if (mode === "edit" && editingId) {
        const result = await updateSupplierProduct(editingId, formData);
        if (result.error || !result.product) {
          setError(result.error ?? "No se pudo actualizar.");
          return;
        }
        const updated = result.product;
        setProducts((current) =>
          current.map((product) =>
            product.id === updated.id ? updated : product,
          ),
        );
        setMessage("Producto actualizado.");
        resetForm();
        return;
      }

      const result = await createSupplierProduct(formData);
      if (result.error || !result.product) {
        setError(result.error ?? "No se pudo crear el producto.");
        return;
      }
      const created = result.product;
      setProducts((current) => [created, ...current]);
      setMessage("Producto cargado.");
      resetForm();
    });
  }

  function handleArchive(productId: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await archiveSupplierProduct(productId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setProducts((current) =>
        current.filter((product) => product.id !== productId),
      );
      if (editingId === productId) resetForm();
      setMessage("Producto archivado.");
    });
  }

  return (
    <div className="space-y-6">
      <section className="supplier-hub-card">
        <div className="supplier-hub-card-header">
          <div>
            <p className="supplier-hub-section-label">Catálogo mayorista</p>
            <h1 className="supplier-hub-heading">
              {mode === "edit" ? "Editar producto" : "Cargar producto"}
            </h1>
            <p className="supplier-hub-subheading">
              Panel interno para proveedores. No aparece en el menú de
              comerciantes ni en el catálogo público.
            </p>
          </div>
          {mode === "edit" ? (
            <button
              type="button"
              className="btn-brand-outline !min-h-9 !px-3 !text-xs"
              onClick={resetForm}
            >
              Nuevo producto
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <ProductImageField
            key={imageKey}
            id="supplier-product-image"
            mode={mode === "edit" ? "edit" : "create"}
            layout="compact"
            initialPreviewUrl={
              mode === "edit" ? editingProduct?.imageUrl ?? null : null
            }
            disabled={pending}
            onImageReady={({ file }) => {
              setImageFile(file);
            }}
            onError={(msg) => setError(msg)}
          />

          <div className="space-y-3">
            <div>
              <label htmlFor="supplier-title" className="label-field">
                Título
              </label>
              <input
                id="supplier-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
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
                value={description}
                onChange={(event) => setDescription(event.target.value)}
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
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
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
                    value={basePriceUsd}
                    onChange={(event) => setBasePriceUsd(event.target.value)}
                    className="input-field !mt-0 pl-7"
                    placeholder="0.00"
                    disabled={pending}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? <p className="supplier-hub-success mt-4">{message}</p> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-brand"
            onClick={handleSubmit}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : mode === "edit" ? (
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            ) : (
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {mode === "edit" ? "Guardar cambios" : "Publicar en hub"}
          </button>
        </div>
      </section>

      <section>
        <p className="supplier-hub-section-label">
          Productos cargados ({products.length})
        </p>
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
                  editingId === product.id && "supplier-hub-list-item-active",
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
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
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
    </div>
  );
}
