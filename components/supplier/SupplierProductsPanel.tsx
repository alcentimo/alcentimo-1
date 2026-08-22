"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import {
  Boxes,
  CircleAlert,
  Images,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  buildProductImagesFormPayload,
  ProductGalleryField,
  type ProductGalleryFieldValue,
} from "@/components/dashboard/ProductGalleryField";
import { SupplierVariantsEditor } from "@/components/supplier/SupplierVariantsEditor";
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
import {
  SUPPLIER_GALLERY_MAX_IMAGES,
  supplierImagesToEditImages,
} from "@/lib/supplier/product-gallery";
import {
  SUPPLIER_PRODUCT_CATEGORIES,
  normalizeSupplierProductCategory,
  supplierCategoryLabel,
  type SupplierProductCategory,
} from "@/lib/supplier/categories";
import {
  countSupplierVariantOptions,
  emptySupplierVariants,
  serializeSupplierVariants,
  supplierVariantAttributeLabel,
  type SupplierProductVariants,
} from "@/lib/supplier/variants";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

interface SupplierProductsPanelProps {
  initialProducts: SupplierProduct[];
}

type ProductFormState = {
  title: string;
  description: string;
  category: SupplierProductCategory;
  variants: SupplierProductVariants;
  stock: string;
  basePriceUsd: string;
  gallery: ProductGalleryFieldValue;
  galleryKey: number;
};

const EMPTY_GALLERY: ProductGalleryFieldValue = {
  items: [],
  removedDbIds: [],
};

const EMPTY_FORM: Omit<ProductFormState, "galleryKey"> = {
  title: "",
  description: "",
  category: "otros",
  variants: emptySupplierVariants(),
  stock: "0",
  basePriceUsd: "",
  gallery: EMPTY_GALLERY,
};

function formFromProduct(product: SupplierProduct): ProductFormState {
  return {
    title: product.title,
    description: product.description,
    category: product.category,
    variants: product.variants ?? emptySupplierVariants(),
    stock: String(product.stock),
    basePriceUsd: String(product.basePriceUsd),
    gallery: EMPTY_GALLERY,
    galleryKey: Date.now(),
  };
}

function buildFormData(form: ProductFormState): FormData {
  const formData = new FormData();
  formData.set("title", form.title);
  formData.set("description", form.description);
  formData.set("category", form.category);
  formData.set("variants", serializeSupplierVariants(form.variants));
  formData.set("stock", form.stock);
  formData.set("basePriceUsd", form.basePriceUsd);

  const { json, files } = buildProductImagesFormPayload(form.gallery);
  formData.set("product_images_json", json);
  formData.delete("images");
  formData.delete("image");
  for (const file of files) {
    formData.append("images", file);
  }
  return formData;
}

function ProductFields({
  idPrefix,
  form,
  pending,
  onChange,
  onGalleryError,
  onGalleryBusy,
  initialImages,
  imageMode,
}: {
  idPrefix: string;
  form: ProductFormState;
  pending: boolean;
  onChange: (next: ProductFormState) => void;
  onGalleryError: (msg: string) => void;
  onGalleryBusy: (busy: boolean) => void;
  initialImages: ReturnType<typeof supplierImagesToEditImages>;
  imageMode: "create" | "edit";
}) {
  return (
    <>
      <ProductGalleryField
        key={form.galleryKey}
        id={`${idPrefix}-image`}
        mode={imageMode}
        layout="stacked"
        initialImages={initialImages}
        maxImages={SUPPLIER_GALLERY_MAX_IMAGES}
        disabled={pending}
        onChange={(gallery) => onChange({ ...form, gallery })}
        onError={onGalleryError}
        onBusyChange={onGalleryBusy}
      />

      <div className="mt-5 space-y-3">
        <div>
          <label htmlFor={`${idPrefix}-title`} className="label-field">
            Título
          </label>
          <input
            id={`${idPrefix}-title`}
            value={form.title}
            onChange={(event) =>
              onChange({ ...form, title: event.target.value })
            }
            className="input-field"
            placeholder="Ej: Caja mayorista de snacks"
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-category`} className="label-field">
            Categoría
          </label>
          <select
            id={`${idPrefix}-category`}
            className="input-field"
            value={form.category}
            disabled={pending}
            onChange={(event) =>
              onChange({
                ...form,
                category: normalizeSupplierProductCategory(event.target.value),
              })
            }
          >
            {SUPPLIER_PRODUCT_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-description`} className="label-field">
            Descripción
          </label>
          <textarea
            id={`${idPrefix}-description`}
            rows={4}
            value={form.description}
            onChange={(event) =>
              onChange({ ...form, description: event.target.value })
            }
            className="input-field resize-none"
            placeholder="Detalles para el catálogo de Alcéntimo (contenido, presentación, condiciones…)"
            disabled={pending}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${idPrefix}-stock`} className="label-field">
              Stock
            </label>
            <input
              id={`${idPrefix}-stock`}
              type="number"
              min={0}
              step={1}
              value={form.stock}
              onChange={(event) =>
                onChange({ ...form, stock: event.target.value })
              }
              className="input-field"
              disabled={pending}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-price`} className="label-field">
              Costo (USD)
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-400">
                $
              </span>
              <input
                id={`${idPrefix}-price`}
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={form.basePriceUsd}
                onChange={(event) =>
                  onChange({ ...form, basePriceUsd: event.target.value })
                }
                className="input-field !mt-0 pl-7"
                placeholder="0.00"
                disabled={pending}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <SupplierVariantsEditor
          idPrefix={`${idPrefix}-variants`}
          value={form.variants}
          disabled={pending}
          onChange={(variants) => onChange({ ...form, variants })}
        />
      </div>
    </>
  );
}

export function SupplierProductsPanel({
  initialProducts,
}: SupplierProductsPanelProps) {
  const [products, setProducts] = useState(initialProducts);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [createForm, setCreateForm] = useState<ProductFormState>({
    ...EMPTY_FORM,
    galleryKey: 0,
  });
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(
    null,
  );
  const [editForm, setEditForm] = useState<ProductFormState | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState<string | null>(null);
  const [createGalleryBusy, setCreateGalleryBusy] = useState(false);
  const [editGalleryBusy, setEditGalleryBusy] = useState(false);
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

  const filteredProducts = useMemo(() => {
    if (categoryFilter === "all") return products;
    return products.filter((product) => product.category === categoryFilter);
  }, [products, categoryFilter]);

  const editOpen = Boolean(editingProduct && editForm);

  function resetCreateForm() {
    setCreateForm({
      ...EMPTY_FORM,
      variants: emptySupplierVariants(),
      gallery: EMPTY_GALLERY,
      galleryKey: Date.now(),
    });
    setCreateError(null);
    setCreateGalleryBusy(false);
  }

  function closeEditModal() {
    setEditingProduct(null);
    setEditForm(null);
    setEditError(null);
    setEditGalleryBusy(false);
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
      setCreateMessage(
        "Producto guardado como borrador.",
      );
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
            <p className="supplier-hub-section-label">Inventario</p>
            <h1 className="supplier-hub-heading">Cargar producto</h1>
          </div>
        </div>

        <div className="mt-5">
          <ProductFields
            idPrefix="supplier-create"
            form={createForm}
            pending={pending}
            onChange={setCreateForm}
            onGalleryError={setCreateError}
            onGalleryBusy={setCreateGalleryBusy}
            initialImages={[]}
            imageMode="create"
          />
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
            disabled={pending || createGalleryBusy}
          >
            {pending && !editOpen ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Guardar
          </button>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="supplier-hub-section-label">
            Productos cargados ({filteredProducts.length}
            {categoryFilter !== "all" ? ` de ${products.length}` : ""})
          </p>
          <div className="w-full max-w-xs sm:w-56">
            <label htmlFor="supplier-category-filter" className="label-field">
              Filtrar por categoría
            </label>
            <select
              id="supplier-category-filter"
              className="input-field"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">Todas</option>
              {SUPPLIER_PRODUCT_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {listMessage ? (
          <p className="supplier-hub-success mt-2">{listMessage}</p>
        ) : null}
        {products.length === 0 ? (
          <p className="supplier-hub-empty mt-3">
            Aún no hay productos. Usa el formulario de arriba para cargar el
            primero.
          </p>
        ) : filteredProducts.length === 0 ? (
          <p className="supplier-hub-empty mt-3">
            No hay productos en esta categoría.
          </p>
        ) : (
          <ul className="supplier-hub-list mt-3">
            {filteredProducts.map((product) => {
              const variantCount = countSupplierVariantOptions(product.variants);
              const photoCount = Math.max(
                product.gallery?.length ?? 0,
                product.imageUrl ? 1 : 0,
              );
              return (
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
                    {photoCount > 1 ? (
                      <span className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 rounded-md bg-black/65 px-1 py-0.5 text-[9px] font-semibold text-white">
                        <Images className="h-2.5 w-2.5" aria-hidden="true" />
                        {photoCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                      {product.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                      {product.description || "Sin descripción"}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <span>{formatUsd(product.basePriceUsd)}</span>
                      <span>· Stock {product.stock}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                        {supplierCategoryLabel(product.category)}
                      </span>
                      {product.publicationStatus === "published" ? (
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
                          En catálogo
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                          Borrador
                        </span>
                      )}
                      {variantCount > 0 ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {supplierVariantAttributeLabel(product.variants)} ·{" "}
                          {variantCount}
                        </span>
                      ) : null}
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
              );
            })}
          </ul>
        )}
      </section>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) closeEditModal();
        }}
        containerClassName="max-w-3xl"
      >
        <DialogContent
          className="relative max-h-[90vh] overflow-y-auto border-emerald-200/70 p-5 shadow-[0_16px_48px_rgba(5,150,105,0.12)] sm:p-6 dark:border-emerald-900/40"
          onClose={closeEditModal}
        >
          <DialogHeader>
            <p className="supplier-hub-section-label">Edición</p>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription>
              Actualiza fotos, categoría, variantes, stock o precio. Las órdenes
              ya emitidas conservan el costo anterior.
            </DialogDescription>
          </DialogHeader>

          {editForm && editingProduct ? (
            <div className="mt-5 space-y-4">
              <ProductFields
                idPrefix="supplier-edit"
                form={editForm}
                pending={pending}
                onChange={(next) => setEditForm(next)}
                onGalleryError={setEditError}
                onGalleryBusy={setEditGalleryBusy}
                initialImages={supplierImagesToEditImages(
                  editingProduct.gallery ?? [],
                )}
                imageMode="edit"
              />

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
                  disabled={pending || editGalleryBusy}
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
