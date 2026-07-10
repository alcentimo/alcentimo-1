"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  createProduct,
  updateProduct,
  type ProductEditData,
  type ProductFormState,
} from "@/lib/products/actions";
import { compressImageForUpload } from "@/lib/client-image-compress";
import type { Store } from "@/lib/database.types";
import { getStoreCatalogUrl } from "@/lib/stores";
import { formatUsd, formatVes } from "@/lib/format";
import {
  ProductVariantsEditor,
  serializeVariantsForForm,
} from "@/components/dashboard/ProductVariantsEditor";
import type { VariantFormInput } from "@/lib/products/variants";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface ProductFormProps {
  store: Store;
  categories: CategoryOption[];
  exchangeRate: number | null;
  mode?: "create" | "edit";
  initialData?: ProductEditData;
}

const initialState: ProductFormState = {};

function toVariantInputs(
  variants: ProductEditData["variants"],
): VariantFormInput[] {
  return variants.map((variant) => ({
    name: variant.name,
    priceExtraUsd: String(variant.price_extra_usd),
    stock: String(variant.stock),
  }));
}

export function ProductForm({
  store,
  categories,
  exchangeRate,
  mode = "create",
  initialData,
}: ProductFormProps) {
  const action = mode === "edit" ? updateProduct : createProduct;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [priceUsd, setPriceUsd] = useState(
    initialData ? String(initialData.priceUsd) : "",
  );
  const [variants, setVariants] = useState<VariantFormInput[]>(
    initialData ? toVariantInputs(initialData.variants) : [],
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialData?.thumbUrl ?? null,
  );
  const [compressing, setCompressing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [clientOptimizeHint, setClientOptimizeHint] = useState<string | null>(null);
  const catalogUrl = getStoreCatalogUrl(store.slug);
  const hasCustomVariants = variants.length > 0;

  const priceVes = useMemo(() => {
    const usd = parseFloat(priceUsd);
    if (!exchangeRate || !Number.isFinite(usd) || usd < 0) return null;
    return usd * exchangeRate;
  }, [priceUsd, exchangeRate]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setClientOptimizeHint(null);
    setLocalError(null);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else if (initialData?.thumbUrl) {
      setPreviewUrl(initialData.thumbUrl);
    } else {
      setPreviewUrl(null);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set(
      "variants_json",
      serializeVariantsForForm(
        variants,
        initialData?.variants.map((variant) => variant.id),
      ),
    );

    const imageFile = formData.get("image");

    if (imageFile instanceof File && imageFile.size > 0) {
      try {
        setCompressing(true);
        const { file: compressed, message } = await compressImageForUpload(imageFile);
        formData.set("image", compressed);
        setClientOptimizeHint(message);
      } catch {
        setLocalError(
          "No se pudo comprimir la imagen. Prueba con JPG o PNG de menor tamaño.",
        );
        setCompressing(false);
        return;
      } finally {
        setCompressing(false);
      }
    }

    formAction(formData);
  }

  const isBusy = pending || compressing;
  const displayError = localError ?? state.error;

  if (state.success) {
    return (
      <div className="alert-success">
        <h2 className="text-lg font-semibold text-teal-900 sm:text-xl dark:text-teal-100">
          {mode === "edit" ? "¡Producto actualizado!" : "¡Producto publicado!"}
        </h2>
        <p className="mt-2 text-base text-teal-800 sm:text-sm dark:text-teal-200">
          Ya está visible en tu catálogo público.
        </p>
        {state.imageOptimizedMessage && (
          <p className="mt-2 rounded-lg bg-teal-100/80 px-3 py-2 text-xs text-teal-900 dark:bg-teal-900/40 dark:text-teal-100">
            ✓ {state.imageOptimizedMessage}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href={state.catalogUrl ?? catalogUrl}
            className="btn-success w-full sm:w-auto"
          >
            Ver catálogo
          </Link>
          {mode === "create" ? (
            <Link
              href="/dashboard/productos/nuevo"
              className="btn-secondary w-full sm:w-auto"
            >
              Agregar otro
            </Link>
          ) : (
            <Link
              href="/dashboard/inventario"
              className="btn-secondary w-full sm:w-auto"
            >
              Volver al inventario
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="space-y-5"
    >
      <input type="hidden" name="store_id" value={store.id} readOnly />
      {mode === "edit" && initialData && (
        <>
          <input type="hidden" name="product_id" value={initialData.productId} readOnly />
          <input
            type="hidden"
            name="default_variant_id"
            value={initialData.defaultVariantId}
            readOnly
          />
        </>
      )}

      <div className="info-box">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
          Tu tienda
        </p>
        <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50">{store.name}</p>
        <Link
          href={catalogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link-brand mt-1 inline-block text-sm"
        >
          {catalogUrl}
        </Link>
      </div>

      <div>
        <label htmlFor="name" className="label-field">
          Nombre del producto <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={120}
          defaultValue={initialData?.name ?? ""}
          placeholder="Ej: Arroz Premium 1kg"
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="short_description" className="label-field">
          Descripción corta
        </label>
        <input
          id="short_description"
          name="short_description"
          maxLength={160}
          defaultValue={initialData?.shortDescription ?? ""}
          placeholder="Aparece en el listado del catálogo"
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="price_usd" className="label-field">
            Precio base USD <span className="text-red-500">*</span>
          </label>
          <input
            id="price_usd"
            name="price_usd"
            type="number"
            required
            min={0}
            step="0.01"
            placeholder="0.00"
            value={priceUsd}
            onChange={(e) => setPriceUsd(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <p className="label-field">Equivalente en Bs</p>
          <div className="price-box mt-1.5 flex min-h-11 items-center !p-3.5">
            <span className="text-base font-semibold text-teal-800 md:text-sm dark:text-teal-200">
              {priceVes != null ? formatVes(priceVes) : "—"}
            </span>
          </div>
          {exchangeRate && (
            <p className="mt-1.5">
              <span className="price-rate-badge">
                Bs. {exchangeRate.toFixed(2)} / USD · {formatUsd(parseFloat(priceUsd) || 0)}
              </span>
            </p>
          )}
        </div>
      </div>

      {!hasCustomVariants && (
        <div>
          <label htmlFor="stock_quantity" className="label-field">
            Stock disponible <span className="text-red-500">*</span>
          </label>
          <input
            id="stock_quantity"
            name="stock_quantity"
            type="number"
            required
            min={0}
            step={1}
            defaultValue={initialData?.stockQuantity ?? 0}
            className="input-field"
          />
        </div>
      )}

      {hasCustomVariants && (
        <input type="hidden" name="stock_quantity" value="0" readOnly />
      )}

      <div>
        <label htmlFor="low_stock_threshold" className="label-field">
          Alerta de stock bajo
        </label>
        <input
          id="low_stock_threshold"
          name="low_stock_threshold"
          type="number"
          min={0}
          step={1}
          defaultValue={initialData?.lowStockThreshold ?? 5}
          className="input-field"
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          Recibirás alerta en el dashboard cuando el stock sea igual o menor a este valor.
        </p>
      </div>

      <ProductVariantsEditor
        variants={variants}
        onChange={setVariants}
        disabled={isBusy}
      />

      <div>
        <label htmlFor="category_id" className="label-field">
          Categoría
        </label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={initialData?.categoryId ?? ""}
          className="input-field"
        >
          <option value="">General (automática)</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="image" className="label-field">
          Foto del producto
        </label>
        <input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageChange}
          className="file-input"
        />
        <p className="mt-1 text-xs text-zinc-500">
          {mode === "edit"
            ? "Deja vacío para conservar la imagen actual."
            : "Se comprime en tu dispositivo a WebP (≤ 500 KB) antes de subir."}
        </p>
        {clientOptimizeHint && (
          <p className="mt-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200">
            ✓ {clientOptimizeHint}
          </p>
        )}
        {previewUrl && (
          <div className="relative mt-3 aspect-square w-full max-w-[8rem] overflow-hidden rounded-xl border border-zinc-200/80 shadow-sm sm:max-w-[10rem] dark:border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Vista previa" className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      {displayError && <p className="alert-error">{displayError}</p>}

      <button type="submit" disabled={isBusy} className="btn-primary">
        {compressing
          ? "Comprimiendo imagen…"
          : pending
            ? mode === "edit"
              ? "Guardando cambios…"
              : "Publicando producto…"
            : mode === "edit"
              ? "Guardar cambios"
              : "Publicar producto"}
      </button>
    </form>
  );
}
