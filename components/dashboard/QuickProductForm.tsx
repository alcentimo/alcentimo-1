"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import {
  createProduct,
  type ProductFormState,
} from "@/lib/products/actions";
import {
  buildProductImagesFormPayload,
  ProductGalleryField,
  type ProductGalleryFieldValue,
} from "@/components/dashboard/ProductGalleryField";
import { ProductSubmitOverlay } from "@/components/dashboard/ProductSubmitOverlay";
import { serializeVariantsForForm } from "@/components/dashboard/ProductVariantsEditor";
import { RubroVariantsSection } from "@/components/rubros/RubroVariantsSection";
import { RubroModifiersSection } from "@/components/rubros/RubroModifiersSection";
import { RubroTechSpecsSection } from "@/components/rubros/RubroTechSpecsSection";
import { RubroCollectibleSection } from "@/components/rubros/RubroCollectibleSection";
import { RubroBeautySection } from "@/components/rubros/RubroBeautySection";
import { ProductExtraFieldsSection } from "@/components/dashboard/ProductExtraFieldsSection";
import { serializeExtraFieldsJson } from "@/lib/products/extra-fields";
import { useProductCategoryFields } from "@/components/dashboard/useProductCategoryFields";
import { storeUsesRubroProductModule } from "@/lib/rubros/registry";
import {
  emptyFoodModifiers,
  serializeFoodModifiersJson,
  type FoodModifiersConfig,
} from "@/lib/rubros/modules/alimentos";
import type { Store } from "@/lib/database.types";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import type { VariantFormInput } from "@/lib/products/variants";
import { formatCountryCurrency } from "@/lib/country-config";
import { useCountry } from "@/components/providers/CountryProvider";
import { getSiteUrl } from "@/lib/site-url";
import { getTransactionalCatalogPublicUrl } from "@/lib/stores";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductCompareAtField } from "@/components/dashboard/ProductCompareAtField";
import { ProductCopyAiFields } from "@/components/dashboard/ProductCopyAiFields";
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
  const { config: countryConfig } = useCountry();
  const [state, formAction, pending] = useActionState(createProduct, initialState);
  const [priceUsd, setPriceUsd] = useState("");
  const [compareAtUsd, setCompareAtUsd] = useState("");
  const [variants, setVariants] = useState<VariantFormInput[]>([]);
  const [foodModifiers, setFoodModifiers] =
    useState<FoodModifiersConfig>(emptyFoodModifiers);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [galleryValue, setGalleryValue] = useState<ProductGalleryFieldValue>({
    items: [],
    removedDbIds: [],
  });
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryReady, setGalleryReady] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const saveIntentRef = useRef<SaveIntent>("close");
  const submittedNameRef = useRef("");

  const {
    categorySlug,
    fieldLabels,
    categoryLabel,
    extraFields,
    setExtraFields,
  } = useProductCategoryFields(productFormConfig);

  const isRopaModa = storeUsesRubroProductModule(
    productFormConfig.rubroTienda,
    "ropa-moda",
  );
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

  const hasCustomVariants = variants.some((variant) => variant.name.trim().length > 0);

  const namePlaceholder = isAlimentos
    ? "Ej: Arepa reina pepiada"
    : isTecnologia
      ? "Ej: Smartphone Nova X 256 GB"
      : isColeccionables
        ? "Ej: Figura Exclusive Chase #42"
        : isSaludBelleza
          ? "Ej: Sérum vitamina C 30 ml"
          : "Ej: Arroz Premium 1kg";

  const priceLocal = useMemo(() => {
    const usd = parseFloat(priceUsd);
    if (
      !countryConfig.currency.showLocalEquivalent ||
      !exchangeRate ||
      !Number.isFinite(usd) ||
      usd <= 0
    ) {
      return null;
    }
    return usd * exchangeRate;
  }, [priceUsd, exchangeRate, countryConfig.currency.showLocalEquivalent]);

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
    setPriceUsd("");
    setCompareAtUsd("");
    setVariants([]);
    setFoodModifiers(emptyFoodModifiers());
    setAdvancedOpen(false);
    setGalleryValue({ items: [], removedDbIds: [] });
    setGalleryReady(false);
    setLocalError(null);
    setExtraFields({});
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);

    const usd = parseFloat(priceUsd);
    if (!Number.isFinite(usd) || usd <= 0) {
      setLocalError("Ingresa un precio válido en dólares.");
      return;
    }

    if (galleryValue.items.length === 0) {
      setLocalError("Agrega al menos una foto del producto.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    submittedNameRef.current = String(formData.get("name") ?? "").trim();
    formData.set("price_usd", usd.toFixed(4));
    formData.set("product_category_slug", categorySlug);
    formData.set("custom_category_name", "");
    formData.set("variants_json", serializeVariantsForForm(variants));
    formData.set(
      "extra_fields_json",
      serializeExtraFieldsJson(
        isRopaModa || isAlimentos ? {} : extraFields,
      ),
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
    }

    const { json, files } = buildProductImagesFormPayload(galleryValue);
    formData.set("product_images_json", json);
    formData.delete("images");
    formData.delete("image");
    for (const file of files) {
      formData.append("images", file);
    }

    formAction(formData);
  }

  const isBusy = pending || galleryBusy;
  const displayError = localError ?? state.error;
  const submitDisabled = isBusy || !galleryReady;

  return (
    <>
      <ProductSubmitOverlay
        visible={pending}
        hasImage={galleryValue.items.some((item) => item.file)}
        mode="create"
      />
      <form
        onSubmit={handleSubmit}
        encType="multipart/form-data"
        className="space-y-4"
      >
      <input type="hidden" name="store_id" value={store.id} readOnly />

      <ProductCopyAiFields
        idPrefix="quick"
        name={productName}
        onNameChange={setProductName}
        shortDescription={shortDescription}
        onShortDescriptionChange={setShortDescription}
        description={description}
        onDescriptionChange={setDescription}
        storeRubro={productFormConfig.rubroTienda}
        categoryLabel={categoryLabel}
        disabled={isBusy}
        variant="compact"
        namePlaceholder={namePlaceholder}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="quick-price-usd" className="payment-field-label">
            {countryConfig.currency.baseCurrencyLabel}{" "}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="quick-price-usd"
            name="price_usd"
            type="number"
            required
            min={0}
            step="0.01"
            placeholder="0.00"
            value={priceUsd}
            onChange={(e) => setPriceUsd(e.target.value)}
            className="payment-field-input mt-1.5"
            inputMode="decimal"
          />
        </div>
        {countryConfig.currency.showLocalEquivalent && (
          <div>
            <Label htmlFor="quick-price-ves" className="payment-field-label">
              {countryConfig.currency.localCurrencyLabel}
            </Label>
            <Input
              id="quick-price-ves"
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
        )}
      </div>

      <ProductCompareAtField
        priceUsd={priceUsd}
        compareAtUsd={compareAtUsd}
        onCompareAtUsdChange={setCompareAtUsd}
        disabled={isBusy}
        variant="compact"
        idPrefix="quick-compare-at"
      />

      <ProductGalleryField
        id="quick-image"
        mode="create"
        layout="compact"
        disabled={pending}
        onBusyChange={setGalleryBusy}
        onReadyChange={setGalleryReady}
        onChange={setGalleryValue}
        onError={(message) => {
          setLocalError(message);
          setGalleryReady(galleryValue.items.length > 0);
        }}
      />

      <input
        type="hidden"
        name="product_category_slug"
        value={categorySlug}
        readOnly
      />

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
        <RubroBeautySection
          rubro={productFormConfig.rubroTienda}
          values={extraFields}
          onChange={setExtraFields}
          disabled={isBusy}
          variant="compact"
        />
      ) : null}

      {isRopaModa || isAlimentos || isSaludBelleza ? (
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

            {!isRopaModa && !isAlimentos && !isSaludBelleza ? (
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

      {!galleryReady && !galleryBusy && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Sube al menos una foto para habilitar la publicación.
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
    </>
  );
}
