"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  createProduct,
  updateProduct,
  type ProductEditData,
  type ProductFormState,
} from "@/lib/products/actions";
import { ProductImageField } from "@/components/dashboard/ProductImageField";
import type { Store } from "@/lib/database.types";
import { formatCountryCurrency } from "@/lib/country-config";
import { useCountry } from "@/components/providers/CountryProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ProductExtraFieldsSection } from "@/components/dashboard/ProductExtraFieldsSection";
import {
  pickExtraFieldValues,
  serializeExtraFieldsJson,
  type ProductExtraFieldsMap,
} from "@/lib/products/extra-fields";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface ProductCatalogFormProps {
  store: Store;
  categories: CategoryOption[];
  exchangeRate: number | null;
  fieldLabels?: string[];
  storeCategoryLabel?: string | null;
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
  fieldLabels = [],
  storeCategoryLabel = null,
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
  const [compressedImageFile, setCompressedImageFile] = useState<File | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageProcessed, setImageProcessed] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [extraFields, setExtraFields] = useState<ProductExtraFieldsMap>(() =>
    pickExtraFieldValues(initialData?.extraFields ?? {}, fieldLabels),
  );

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

  useEffect(() => {
    if (!initialData) return;
    setExtraFields(pickExtraFieldValues(initialData.extraFields ?? {}, fieldLabels));
  }, [initialData, fieldLabels]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("variants_json", "[]");
    formData.set("extra_fields_json", serializeExtraFieldsJson(extraFields));

    if (compressedImageFile) {
      formData.set("image", compressedImageFile);
    } else {
      formData.delete("image");
    }

    formAction(formData);
  }

  const isBusy = pending || imageBusy;
  const displayError = localError ?? state.error;
  const submitDisabled = isBusy || (mode === "create" && !imageProcessed);

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

      <ProductImageField
        id="catalog-image"
        mode={mode}
        layout="compact"
        initialPreviewUrl={initialData?.thumbUrl ?? null}
        disabled={pending}
        onBusyChange={setImageBusy}
        onProcessedChange={setImageProcessed}
        onImageReady={({ file }) => {
          setCompressedImageFile(file);
          setLocalError(null);
        }}
        onError={(message) => {
          setLocalError(message);
          setCompressedImageFile(null);
          setImageProcessed(false);
        }}
      />

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
        <Label htmlFor="catalog-short-description" className="payment-field-label">
          Descripción corta
        </Label>
        <Input
          id="catalog-short-description"
          name="short_description"
          maxLength={160}
          defaultValue={initialData?.shortDescription ?? ""}
          placeholder="Aparece en el listado del catálogo"
          className="payment-field-input mt-1.5"
        />
      </div>

      <ProductExtraFieldsSection
        fieldLabels={fieldLabels}
        values={extraFields}
        onChange={setExtraFields}
        categoryLabel={storeCategoryLabel}
        disabled={isBusy}
        variant="compact"
      />

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
          Cantidad en stock <span className="text-red-500">*</span>
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

      <div>
        <Label htmlFor="catalog-low-stock" className="payment-field-label">
          Umbral de alerta de stock
        </Label>
        <Input
          id="catalog-low-stock"
          name="low_stock_threshold"
          type="number"
          min={0}
          step={1}
          defaultValue={initialData?.lowStockThreshold ?? 5}
          className="payment-field-input mt-1.5"
        />
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          Se marcará en rojo cuando queden pocas unidades (ej. menos de 3).
        </p>
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
        <Button type="submit" size="sm" disabled={submitDisabled} className="btn-brand min-w-[7rem]">
          {pending ? (
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
