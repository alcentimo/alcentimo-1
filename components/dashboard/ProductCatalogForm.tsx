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
import { ProductCategorySelector } from "@/components/dashboard/ProductCategorySelector";
import { serializeExtraFieldsJson } from "@/lib/products/extra-fields";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import { useProductCategoryFields } from "@/components/dashboard/useProductCategoryFields";
import {
  rubroHidesProductCategory,
  storeUsesRubroProductModule,
} from "@/lib/rubros/registry";
import { RubroModifiersSection } from "@/components/rubros/RubroModifiersSection";
import { RubroVariantsSection } from "@/components/rubros/RubroVariantsSection";
import { RubroTechSpecsSection } from "@/components/rubros/RubroTechSpecsSection";
import { RubroCollectibleSection } from "@/components/rubros/RubroCollectibleSection";
import { RubroBeautySection } from "@/components/rubros/RubroBeautySection";
import { serializeVariantsForForm } from "@/components/dashboard/ProductVariantsEditor";
import {
  emptyFoodModifiers,
  serializeFoodModifiersJson,
  type FoodModifiersConfig,
} from "@/lib/rubros/modules/alimentos";
import type { VariantFormInput } from "@/lib/products/variants";

interface ProductCatalogFormProps {
  store: Store;
  exchangeRate: number | null;
  productFormConfig: StoreProductFormConfig;
  mode?: "create" | "edit";
  initialData?: ProductEditData;
  onSuccess: () => void;
  onCancel?: () => void;
}

const initialState: ProductFormState = {};

export function ProductCatalogForm({
  store,
  exchangeRate,
  productFormConfig,
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
  const [variants, setVariants] = useState<VariantFormInput[]>(() =>
    (initialData?.variants ?? []).map((variant) => ({
      id: variant.id,
      name: variant.name,
      priceExtraUsd: String(variant.price_extra_usd),
      stock: String(variant.stock),
      attributes: variant.attributes,
    })),
  );
  const [foodModifiers, setFoodModifiers] = useState<FoodModifiersConfig>(
    () => initialData?.foodModifiers ?? emptyFoodModifiers(),
  );
  const {
    categorySlug,
    setCategorySlug,
    customCategoryName,
    setCustomCategoryName,
    fieldLabels,
    categoryLabel,
    extraFields,
    setExtraFields,
  } = useProductCategoryFields(
    productFormConfig,
    initialData?.categorySlug,
    initialData?.extraFields,
  );
  const isRopaModa = rubroHidesProductCategory(productFormConfig.rubroTienda);
  const isAlimentos = storeUsesRubroProductModule(
    productFormConfig.rubroTienda,
    "alimentos",
  );
  const isTecnologia = storeUsesRubroProductModule(
    productFormConfig.rubroTienda,
    "tecnologia",
  );
  const isColeccionables = storeUsesRubroProductModule(
    productFormConfig.rubroTienda,
    "coleccionables",
  );
  const isSaludBelleza = storeUsesRubroProductModule(
    productFormConfig.rubroTienda,
    "salud-belleza",
  );
  const defaultCategorySlug =
    productFormConfig.productCategories[0]?.slug ?? "camisas";
  const hasCustomVariants = variants.some((variant) => variant.name.trim().length > 0);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set(
      "product_category_slug",
      isRopaModa ? defaultCategorySlug : categorySlug,
    );
    formData.set("custom_category_name", isRopaModa ? "" : customCategoryName);
    formData.set(
      "variants_json",
      isAlimentos
        ? serializeVariantsForForm(
            variants,
            initialData?.variants.map((variant) => variant.id),
          )
        : "[]",
    );
    formData.set(
      "extra_fields_json",
      serializeExtraFieldsJson(isRopaModa || isAlimentos ? {} : extraFields),
    );
    if (isAlimentos) {
      formData.set(
        "food_modifiers_json",
        serializeFoodModifiersJson(foodModifiers),
      );
    }
    if ((isAlimentos || isSaludBelleza) && hasCustomVariants) {
      formData.set("stock_quantity", "0");
    }

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
      <input type="hidden" name="product_category_slug" value={categorySlug} readOnly />
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

      {!isRopaModa ? (
        <ProductCategorySelector
          id="catalog-category"
          rubroLabel={productFormConfig.rubroLabel}
          categories={productFormConfig.productCategories}
          categorySlug={categorySlug}
          customCategoryName={customCategoryName}
          onCategorySlugChange={setCategorySlug}
          onCustomCategoryNameChange={setCustomCategoryName}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      {!isRopaModa &&
      !isAlimentos &&
      !isTecnologia &&
      !isColeccionables &&
      !isSaludBelleza &&
      fieldLabels.length > 0 ? (
        <ProductExtraFieldsSection
          fieldLabels={fieldLabels}
          values={extraFields}
          onChange={setExtraFields}
          categoryLabel={categoryLabel}
          disabled={isBusy}
          variant="compact"
        />
      ) : null}

      {isTecnologia ? (
        <RubroTechSpecsSection
          rubro={productFormConfig.rubroTienda}
          categorySlug={categorySlug}
          categoryLabel={categoryLabel}
          values={extraFields}
          onChange={setExtraFields}
          disabled={isBusy}
          variant="compact"
        />
      ) : null}

      {isColeccionables ? (
        <RubroCollectibleSection
          rubro={productFormConfig.rubroTienda}
          values={extraFields}
          onChange={setExtraFields}
          disabled={isBusy}
          variant="compact"
        />
      ) : null}

      {isSaludBelleza ? (
        <>
          <RubroBeautySection
            rubro={productFormConfig.rubroTienda}
            values={extraFields}
            onChange={setExtraFields}
            disabled={isBusy}
            variant="compact"
          />
          <RubroVariantsSection
            rubro={productFormConfig.rubroTienda}
            variants={variants}
            onChange={setVariants}
            disabled={isBusy}
          />
        </>
      ) : null}

      {isAlimentos ? (
        <>
          <RubroVariantsSection
            rubro={productFormConfig.rubroTienda}
            variants={variants}
            onChange={setVariants}
            disabled={isBusy}
          />
          <RubroModifiersSection
            rubro={productFormConfig.rubroTienda}
            value={foodModifiers}
            onChange={setFoodModifiers}
            disabled={isBusy}
          />
        </>
      ) : null}

      {!((isAlimentos || isSaludBelleza) && hasCustomVariants) ? (
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
      ) : (
        <input type="hidden" name="stock_quantity" value="0" readOnly />
      )}

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

      <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end dark:border-zinc-800">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isBusy}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={submitDisabled}
          className="btn-brand w-full min-w-[7rem] sm:w-auto"
        >
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
