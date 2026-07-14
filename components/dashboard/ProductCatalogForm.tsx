"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2 } from "lucide-react";
import {
  createProduct,
  updateProduct,
  type ProductEditData,
  type ProductFormState,
} from "@/lib/products/actions";
import { compressImageForUpload } from "@/lib/client-image-compress";
import {
  PRODUCT_IMAGE_ASPECT_CLASS,
  PRODUCT_IMAGE_OPTIMIZE_HINT,
  PRODUCT_IMAGE_RECOMMENDED_HINT,
} from "@/lib/product-image";
import type { Store } from "@/lib/database.types";
import { formatCountryCurrency } from "@/lib/country-config";
import { useCountry } from "@/components/providers/CountryProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface ProductCatalogFormProps {
  store: Store;
  categories: CategoryOption[];
  exchangeRate: number | null;
  mode?: "create" | "edit";
  initialData?: ProductEditData;
  onSuccess: () => void;
  onCancel?: () => void;
}

const initialState: ProductFormState = {};

export function ProductCatalogForm({
  store,
  categories,
  exchangeRate,
  mode = "create",
  initialData,
  onSuccess,
  onCancel,
}: ProductCatalogFormProps) {
  const { config: countryConfig } = useCountry();
  const action = mode === "edit" ? updateProduct : createProduct;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [priceUsd, setPriceUsd] = useState(
    initialData ? String(initialData.priceUsd) : "",
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialData?.thumbUrl ?? null,
  );
  const [compressing, setCompressing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [optimizeHint, setOptimizeHint] = useState<string | null>(null);

  const priceLocal = useMemo(() => {
    const usd = parseFloat(priceUsd);
    if (
      !countryConfig.currency.showLocalEquivalent ||
      !exchangeRate ||
      !Number.isFinite(usd) ||
      usd < 0
    ) {
      return null;
    }
    return usd * exchangeRate;
  }, [priceUsd, exchangeRate, countryConfig.currency.showLocalEquivalent]);

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setLocalError(null);
    setOptimizeHint(null);
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
    formData.set("variants_json", "[]");
    formData.set("low_stock_threshold", String(initialData?.lowStockThreshold ?? 5));

    const imageFile = formData.get("image");
    if (imageFile instanceof File && imageFile.size > 0) {
      try {
        setCompressing(true);
        const { file: compressed, message } = await compressImageForUpload(imageFile);
        formData.set("image", compressed);
        setOptimizeHint(message);
      } catch (error) {
        setLocalError(
          error instanceof Error
            ? error.message
            : "No se pudo comprimir la imagen. Prueba con JPG o PNG de menor tamaño.",
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

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-4">
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

      <div className="flex items-start gap-3">
        <div
          className={cn(
            `relative w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 ${PRODUCT_IMAGE_ASPECT_CLASS}`,
            isBusy && "opacity-70",
          )}
        >
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt="Vista previa"
              fill
              sizes="64px"
              className="object-cover"
              unoptimized={previewUrl.startsWith("blob:")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-400">
              <ImagePlus className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
          {compressing && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-white/75 dark:bg-zinc-950/75"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 animate-spin text-teal-600" aria-hidden="true" />
              <span className="text-[9px] font-medium text-teal-700 dark:text-teal-300">
                Optimizando…
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Label htmlFor="catalog-image" className="payment-field-label">
            Foto del producto
          </Label>
          <input
            id="catalog-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageChange}
            className="mt-1.5 block w-full text-xs text-zinc-500 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-100 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700"
          />
          <p className="mt-1 text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
            {PRODUCT_IMAGE_RECOMMENDED_HINT}
          </p>
          <p className="mt-0.5 text-[10px] text-zinc-400">
            {PRODUCT_IMAGE_OPTIMIZE_HINT}
            {mode === "edit" ? " Opcional al editar." : ""}
          </p>
          {optimizeHint && (
            <p className="mt-1.5 text-[10px] text-teal-700 dark:text-teal-400">
              ✓ {optimizeHint}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="catalog-name" className="payment-field-label">
          Nombre
        </Label>
        <Input
          id="catalog-name"
          name="name"
          required
          maxLength={120}
          defaultValue={initialData?.name ?? ""}
          placeholder="Ej: Arroz Premium 1kg"
          className="payment-field-input mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="catalog-category" className="payment-field-label">
          Categoría
        </Label>
        <Select
          id="catalog-category"
          name="category_id"
          defaultValue={initialData?.categoryId ?? ""}
          className="payment-field-input mt-1.5"
        >
          <option value="">General (automática)</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="catalog-price-usd" className="payment-field-label">
            Precio USD
          </Label>
          <Input
            id="catalog-price-usd"
            name="price_usd"
            type="number"
            required
            min={0}
            step="0.01"
            placeholder="0.00"
            value={priceUsd}
            onChange={(e) => setPriceUsd(e.target.value)}
            className="payment-field-input mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="catalog-price-ves" className="payment-field-label">
            Precio Bs.
          </Label>
          <Input
            id="catalog-price-ves"
            readOnly
            value={
              priceLocal != null
                ? formatCountryCurrency(
                    priceLocal,
                    countryConfig.currency.localCurrency,
                    countryConfig.currency.locale,
                  )
                : "—"
            }
            className="payment-field-input mt-1.5 bg-zinc-50 text-zinc-600 dark:bg-zinc-900/50"
            tabIndex={-1}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="catalog-stock" className="payment-field-label">
          Stock
        </Label>
        <Input
          id="catalog-stock"
          name="stock_quantity"
          type="number"
          required
          min={0}
          step={1}
          defaultValue={initialData?.stockQuantity ?? 0}
          className="payment-field-input mt-1.5"
        />
      </div>

      {displayError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {displayError}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isBusy}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isBusy} className="btn-brand min-w-[7rem]">
          {compressing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Optimizando…
            </>
          ) : pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Guardando…
            </>
          ) : mode === "edit" ? (
            "Guardar"
          ) : (
            "Crear producto"
          )}
        </Button>
      </div>
    </form>
  );
}
