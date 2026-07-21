"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import {
  createProduct,
  type ProductFormState,
} from "@/lib/products/actions";
import { ProductImageField } from "@/components/dashboard/ProductImageField";
import { serializeVariantsForForm } from "@/components/dashboard/ProductVariantsEditor";
import { RubroVariantsSection } from "@/components/rubros/RubroVariantsSection";
import { RubroModifiersSection } from "@/components/rubros/RubroModifiersSection";
import { ProductExtraFieldsSection } from "@/components/dashboard/ProductExtraFieldsSection";
import { ProductCategorySelector } from "@/components/dashboard/ProductCategorySelector";
import { serializeExtraFieldsJson } from "@/lib/products/extra-fields";
import { useProductCategoryFields } from "@/components/dashboard/useProductCategoryFields";
import {
  rubroHidesProductCategory,
  storeUsesRubroProductModule,
} from "@/lib/rubros/registry";
import {
  emptyFoodModifiers,
  serializeFoodModifiersJson,
  type FoodModifiersConfig,
} from "@/lib/rubros/modules/alimentos";
import type { Store } from "@/lib/database.types";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import type { VariantFormInput } from "@/lib/products/variants";
import { formatUsd } from "@/lib/format";
import { getSiteUrl } from "@/lib/site-url";
import { getTransactionalCatalogPublicUrl } from "@/lib/stores";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const initialState: ProductFormState = {};

type SaveIntent = "close" | "another";

export interface PublishedProductResult {
  productName: string;
  catalogUrl: string;
}

interface QuickProductFormProps {
  store: Store;
  exchangeRate: number | null;
  productFormConfig: StoreProductFormConfig;
  onComplete: (result?: PublishedProductResult) => void;
  onRefresh: () => void;
  onCancel?: () => void;
  onLimitHit?: () => void;
}

export function QuickProductForm(props: QuickProductFormProps) {
  const [sessionId, setSessionId] = useState(0);

  return (
    <QuickProductFormSession
      key={sessionId}
      {...props}
      onSavedAndAnother={() => {
        props.onRefresh();
        setSessionId((id) => id + 1);
      }}
    />
  );
}

interface QuickProductFormSessionProps extends QuickProductFormProps {
  onSavedAndAnother: () => void;
}

function QuickProductFormSession({
  store,
  exchangeRate,
  productFormConfig,
  onComplete,
  onRefresh,
  onCancel,
  onSavedAndAnother,
  onLimitHit,
}: QuickProductFormSessionProps) {
  const [state, formAction, pending] = useActionState(createProduct, initialState);
  const [priceBs, setPriceBs] = useState("");
  const [variants, setVariants] = useState<VariantFormInput[]>([]);
  const [foodModifiers, setFoodModifiers] =
    useState<FoodModifiersConfig>(emptyFoodModifiers);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [compressedImageFile, setCompressedImageFile] = useState<File | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageProcessed, setImageProcessed] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const saveIntentRef = useRef<SaveIntent>("close");
  const submittedNameRef = useRef("");

  const {
    categorySlug,
    setCategorySlug,
    customCategoryName,
    setCustomCategoryName,
    fieldLabels,
    categoryLabel,
    extraFields,
    setExtraFields,
  } = useProductCategoryFields(productFormConfig);

  const isRopaModa = rubroHidesProductCategory(productFormConfig.rubroTienda);
  const isAlimentos = storeUsesRubroProductModule(
    productFormConfig.rubroTienda,
    "alimentos",
  );
  const defaultCategorySlug =
    productFormConfig.productCategories[0]?.slug ?? "camisas";

  const hasCustomVariants = variants.some((variant) => variant.name.trim().length > 0);

  const priceUsdPreview = useMemo(() => {
    const bs = parseFloat(priceBs);
    if (!exchangeRate || !Number.isFinite(bs) || bs <= 0) return null;
    return bs / exchangeRate;
  }, [priceBs, exchangeRate]);

  useEffect(() => {
    if (!state.success) return;

    if (saveIntentRef.current === "another") {
      onSavedAndAnother();
      saveIntentRef.current = "close";
      return;
    }

    onRefresh();
    onComplete({
      productName: state.productName ?? submittedNameRef.current,
      catalogUrl: state.catalogUrl
        ? state.catalogUrl.startsWith("http")
          ? state.catalogUrl
          : `${getSiteUrl()}${state.catalogUrl}`
        : getTransactionalCatalogPublicUrl(store.slug),
    });
  }, [state.success, state.catalogUrl, state.productName, onComplete, onRefresh, onSavedAndAnother, store.slug]);

  useEffect(() => {
    if (!state.limitHit) return;
    onLimitHit?.();
  }, [state.limitHit, onLimitHit]);

  function resetFormState() {
    setPriceBs("");
    setVariants([]);
    setFoodModifiers(emptyFoodModifiers());
    setAdvancedOpen(false);
    setCompressedImageFile(null);
    setImageProcessed(false);
    setLocalError(null);
    setExtraFields({});
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);

    const bs = parseFloat(priceBs);
    if (!Number.isFinite(bs) || bs <= 0) {
      setLocalError("Ingresa un precio válido en Bs.");
      return;
    }

    if (!exchangeRate || exchangeRate <= 0) {
      setLocalError("No hay tasa del día disponible. Configura la tasa antes de publicar.");
      return;
    }

    if (isRopaModa && !hasCustomVariants) {
      setLocalError("Selecciona al menos una talla y un color con su stock.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    submittedNameRef.current = String(formData.get("name") ?? "").trim();
    const priceUsd = bs / exchangeRate;

    formData.set("price_usd", priceUsd.toFixed(4));
    formData.set(
      "product_category_slug",
      isRopaModa ? defaultCategorySlug : categorySlug,
    );
    formData.set("custom_category_name", isRopaModa ? "" : customCategoryName);
    formData.set("variants_json", serializeVariantsForForm(variants));
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

    if (!hasCustomVariants) {
      const stockValue = advancedOpen
        ? String(formData.get("stock_quantity") ?? "0")
        : "0";
      formData.set("stock_quantity", stockValue);
    } else {
      formData.set("stock_quantity", "0");
    }

    if (!advancedOpen) {
      formData.set("low_stock_threshold", "5");
      formData.set("short_description", "");
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
  const submitDisabled = isBusy || !imageProcessed;

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="space-y-4"
    >
      <input type="hidden" name="store_id" value={store.id} readOnly />

      <div>
        <Label htmlFor="quick-name" className="payment-field-label">
          Nombre <span className="text-red-500">*</span>
        </Label>
        <Input
          id="quick-name"
          name="name"
          required
          maxLength={120}
          placeholder={
            isAlimentos ? "Ej: Arepa reina pepiada" : "Ej: Arroz Premium 1kg"
          }
          className="payment-field-input mt-1.5"
          autoFocus
        />
      </div>

      <div>
        <Label htmlFor="quick-price-bs" className="payment-field-label">
          Precio (Bs) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="quick-price-bs"
          type="number"
          required
          min={0}
          step="0.01"
          placeholder="0.00"
          value={priceBs}
          onChange={(e) => setPriceBs(e.target.value)}
          className="payment-field-input mt-1.5"
          inputMode="decimal"
        />
        {priceUsdPreview != null && (
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Equivalente: {formatUsd(priceUsdPreview)} USD
          </p>
        )}
      </div>

      <ProductImageField
        id="quick-image"
        mode="create"
        layout="compact"
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

      {!isRopaModa ? (
        <ProductCategorySelector
          id="quick-category"
          rubroLabel={productFormConfig.rubroLabel}
          categories={productFormConfig.productCategories}
          categorySlug={categorySlug}
          customCategoryName={customCategoryName}
          onCategorySlugChange={setCategorySlug}
          onCustomCategoryNameChange={setCustomCategoryName}
        />
      ) : (
        <input
          type="hidden"
          name="product_category_slug"
          value={defaultCategorySlug}
          readOnly
        />
      )}

      {!isRopaModa && fieldLabels.length > 0 ? (
        <ProductExtraFieldsSection
          fieldLabels={fieldLabels}
          values={extraFields}
          onChange={setExtraFields}
          categoryLabel={categoryLabel}
          disabled={isBusy}
          variant="compact"
        />
      ) : null}

      {isRopaModa || isAlimentos ? (
        <RubroVariantsSection
          rubro={productFormConfig.rubroTienda}
          variants={variants}
          onChange={setVariants}
          disabled={isBusy}
          required={isRopaModa}
        />
      ) : null}

      {isAlimentos ? (
        <RubroModifiersSection
          rubro={productFormConfig.rubroTienda}
          value={foodModifiers}
          onChange={setFoodModifiers}
          disabled={isBusy}
        />
      ) : null}

      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900/50"
          aria-expanded={advancedOpen}
        >
          <span>Más opciones</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
              advancedOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        {advancedOpen && (
          <div className="space-y-4 border-t border-zinc-200/80 px-4 py-4 dark:border-zinc-800">
            <div>
              <Label htmlFor="quick-short-description" className="payment-field-label">
                Descripción corta
              </Label>
              <Input
                id="quick-short-description"
                name="short_description"
                maxLength={160}
                placeholder="Aparece en el listado del catálogo"
                className="payment-field-input mt-1.5"
              />
            </div>

            {!hasCustomVariants && (
              <div>
                <Label htmlFor="quick-stock" className="payment-field-label">
                  Cantidad en stock
                </Label>
                <Input
                  id="quick-stock"
                  name="stock_quantity"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={0}
                  className="payment-field-input mt-1.5"
                />
              </div>
            )}

            {hasCustomVariants && (
              <input type="hidden" name="stock_quantity" value="0" readOnly />
            )}

            <div>
              <Label htmlFor="quick-low-stock" className="payment-field-label">
                Umbral de alerta de stock
              </Label>
              <Input
                id="quick-low-stock"
                name="low_stock_threshold"
                type="number"
                min={0}
                step={1}
                defaultValue={5}
                className="payment-field-input mt-1.5"
              />
            </div>

            {!isRopaModa && !isAlimentos ? (
              <RubroVariantsSection
                rubro={productFormConfig.rubroTienda}
                variants={variants}
                onChange={setVariants}
                disabled={isBusy}
              />
            ) : null}
          </div>
        )}
      </div>

      {!imageProcessed && !imageBusy && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Sube una foto para habilitar la publicación.
        </p>
      )}

      {displayError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {displayError}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end dark:border-zinc-800">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              resetFormState();
              onCancel();
            }}
            disabled={isBusy}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={submitDisabled}
          className="w-full sm:w-auto"
          onClick={() => {
            saveIntentRef.current = "another";
          }}
        >
          {pending && saveIntentRef.current === "another" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Guardando…
            </>
          ) : (
            "Guardar y agregar otro"
          )}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={submitDisabled}
          className="btn-brand w-full sm:w-auto"
          onClick={() => {
            saveIntentRef.current = "close";
          }}
        >
          {pending && saveIntentRef.current === "close" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Publicando…
            </>
          ) : (
            "Publicar producto"
          )}
        </Button>
      </div>
    </form>
  );
}
