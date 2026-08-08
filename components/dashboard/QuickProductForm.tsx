"use client";

import { useMemo, useRef, useState } from "react";
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
import { PCBuilderSlotField } from "@/components/rubros/tecnologia/PCBuilderSlotField";
import { RubroCollectibleSection } from "@/components/rubros/RubroCollectibleSection";
import { RubroBeautySection } from "@/components/rubros/RubroBeautySection";
import { RubroStationerySection } from "@/components/rubros/RubroStationerySection";
import { StationeryStockHint } from "@/components/rubros/papeleria-libreria-oficina/StationeryStockHint";
import { useStationerySaleVariants } from "@/components/dashboard/useStationerySaleVariants";
import { areStationerySaleVariants } from "@/lib/rubros/modules/papeleria-libreria-oficina/variants";
import { ProductExtraFieldsSection } from "@/components/dashboard/ProductExtraFieldsSection";
import { serializeExtraFieldsJson } from "@/lib/products/extra-fields";
import { useProductCategoryFields } from "@/components/dashboard/useProductCategoryFields";
import { ProductCategorySelector } from "@/components/dashboard/ProductCategorySelector";
import {
  rubroHidesProductCategory,
  storeUsesRubroProductModule,
} from "@/lib/rubros/registry";
import {
  emptyFoodModifiers,
  serializeFoodModifiersJson,
  type FoodModifiersConfig,
} from "@/lib/rubros/modules/alimentos";
import {
  getPrimaryCategorySlugForPCBuilderSlot,
  type PCBuilderSlotId,
} from "@/lib/rubros/modules/tecnologia/pc-builder";
import type { Store } from "@/lib/database.types";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import type { VariantFormInput } from "@/lib/products/variants";
import { formatCountryCurrency } from "@/lib/country-config";
import { useCountry } from "@/components/providers/CountryProvider";
import { getTransactionalCatalogPublicUrl } from "@/lib/stores";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProductCompareAtField } from "@/components/dashboard/ProductCompareAtField";
import { ProductWholesaleField } from "@/components/dashboard/ProductWholesaleField";
import { ProductCopyAiFields } from "@/components/dashboard/ProductCopyAiFields";
import { ProductTitleAutoDetectHint } from "@/components/dashboard/ProductTitleAutoDetectHint";
import { getProductNamePlaceholderForRubro } from "@/src/config/categories";
import { useProductTitleAutoDetect } from "@/components/dashboard/useProductTitleAutoDetect";
import { LocationStockFields } from "@/components/dashboard/LocationStockFields";
import { validateProductPublishInput } from "@/lib/products/validate-publish-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { ensureClientCompressedImages } from "@/lib/products/ensure-client-compressed-images";
import {
  createOptimisticProductId,
  type OptimisticProductDraft,
} from "@/lib/products/optimistic-catalog-item";

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
  onOptimisticCreate?: (draft: OptimisticProductDraft) => void;
  onOptimisticCreateSettled?: (
    tempId: string,
    result: ProductFormState,
  ) => void;
}

export function QuickProductForm(props: QuickProductFormProps) {
  const [sessionId, setSessionId] = useState(0);

  return (
    <QuickProductFormSession
      key={sessionId}
      {...props}
      onSavedAndAnother={() => {
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
  onOptimisticCreate,
  onOptimisticCreateSettled,
}: QuickProductFormSessionProps) {
  const { config: countryConfig } = useCountry();
  const [priceUsd, setPriceUsd] = useState("");
  const [compareAtUsd, setCompareAtUsd] = useState("");
  const [wholesalePriceUsd, setWholesalePriceUsd] = useState("");
  const [wholesaleMinQty, setWholesaleMinQty] = useState("");
  const [variants, setVariants] = useState<VariantFormInput[]>([]);
  const [foodModifiers, setFoodModifiers] =
    useState<FoodModifiersConfig>(emptyFoodModifiers);
  const [pcBuilderSlot, setPcBuilderSlot] = useState<PCBuilderSlotId | "">("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [galleryValue, setGalleryValue] = useState<ProductGalleryFieldValue>({
    items: [],
    removedDbIds: [],
  });
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
  const showCategorySelector = !rubroHidesProductCategory(
    productFormConfig.rubroTienda,
  );

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
  const pcBuilderEnabled = productFormConfig.enablePcBuilder;
  const wholesaleEnabled = productFormConfig.wholesaleEnabled;
  const isColeccionables = storeUsesRubroProductModule(
    productFormConfig.rubroTienda,
    "coleccionables",
  );
  const isSaludBelleza = storeUsesRubroProductModule(
    productFormConfig.rubroTienda,
    "salud-belleza",
  );
  const isPapeleria = storeUsesRubroProductModule(
    productFormConfig.rubroTienda,
    "papeleria-libreria-oficina",
  );

  const hasCustomVariants = variants.some((variant) => variant.name.trim().length > 0);
  const stationeryUnifiedStock = areStationerySaleVariants(variants);

  useStationerySaleVariants(isPapeleria, extraFields, variants, setVariants);

  const isBusy = submitting || galleryBusy;

  const { hint: autoDetectHint, handleCategoryManualChange } =
    useProductTitleAutoDetect({
      title: productName,
      rubro: productFormConfig.rubroTienda,
      categories: productFormConfig.productCategories,
      categorySlug,
      setCategorySlug,
      extraFields,
      setExtraFields,
      applyCategory: showCategorySelector,
      enabled: !isBusy,
    });

  const namePlaceholder = getProductNamePlaceholderForRubro(
    productFormConfig.rubroTienda,
  );

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

  function resetFormState() {
    setPriceUsd("");
    setCompareAtUsd("");
    setWholesalePriceUsd("");
    setWholesaleMinQty("");
    setVariants([]);
    setFoodModifiers(emptyFoodModifiers());
    setPcBuilderSlot("");
    setAdvancedOpen(false);
    setGalleryValue({ items: [], removedDbIds: [] });
    setLocalError(null);
    setExtraFields({});
    setProductName("");
    setShortDescription("");
    setDescription("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const requiresStock = !hasCustomVariants || stationeryUnifiedStock;

    const validationError = validateProductPublishInput({
      name: productName,
      priceUsd,
      galleryItemCount: galleryValue.items.length,
      galleryBusy,
      showCategorySelector,
      categorySlug,
      customCategoryName,
      wholesalePriceUsd,
      wholesaleMinQty,
      requiresStock,
      stockQuantity: requiresStock
        ? String(formData.get("stock_quantity") ?? "").trim()
        : undefined,
    });
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    const usd = parseFloat(priceUsd);
    const stockRaw = String(formData.get("stock_quantity") ?? "").trim();
    const stockQuantity = Number.parseInt(stockRaw, 10);
    submittedNameRef.current = String(formData.get("name") ?? "").trim();
    formData.set("price_usd", usd.toFixed(4));
    formData.set("product_category_slug", categorySlug);
    formData.set(
      "custom_category_name",
      showCategorySelector ? customCategoryName : "",
    );
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

    if (!advancedOpen) {
      formData.set("low_stock_threshold", "5");
    }

    const { json, files } = buildProductImagesFormPayload(galleryValue);
    formData.set("product_images_json", json);
    formData.delete("images");
    formData.delete("image");

    setSubmitting(true);

    try {
      const compressedFiles = await ensureClientCompressedImages(files);
      for (const file of compressedFiles) {
        formData.append("images", file);
      }

      const tempId = createOptimisticProductId();
      const thumbPreviewUrl = compressedFiles[0]
        ? URL.createObjectURL(compressedFiles[0])
        : null;

      const draft: OptimisticProductDraft = {
        tempId,
        productName: submittedNameRef.current,
        priceUsd: usd,
        stockQuantity: Number.isFinite(stockQuantity) ? stockQuantity : 0,
        thumbPreviewUrl,
        categoryName: categoryLabel || undefined,
      };

      onOptimisticCreate?.(draft);

      const intent = saveIntentRef.current;
      if (intent === "another") {
        resetFormState();
        onSavedAndAnother();
        setSubmitting(false);
      } else {
        onComplete({
          productName: draft.productName,
          catalogUrl: getTransactionalCatalogPublicUrl(store.slug),
        });
      }

      void createProduct({}, formData).then((result) => {
        onOptimisticCreateSettled?.(tempId, result);
        if (result.limitHit) {
          onLimitHit?.();
          return;
        }
        if (!result.success && intent === "another") {
          setLocalError(result.error ?? "No se pudo publicar el producto.");
        }
        if (result.success && intent === "another") {
          onRefresh();
        }
      });
    } catch (error) {
      setSubmitting(false);
      setLocalError(
        error instanceof Error
          ? error.message
          : "No se pudieron preparar las fotos. Prueba de nuevo.",
      );
    }
  }

  const hasGallery = galleryValue.items.length > 0;
  const displayError = localError;
  const submitDisabled = isBusy || !hasGallery;

  return (
    <>
      <ProductSubmitOverlay
        visible={submitting}
        hasImage={galleryValue.items.some((item) => item.file)}
        mode="create"
      />
      <form
        onSubmit={handleSubmit}
        noValidate
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
        showDescription={false}
        showShortDescription={false}
      />
      <ProductTitleAutoDetectHint hint={autoDetectHint} />

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

      <ProductGalleryField
        id="quick-image"
        mode="create"
        layout="compact"
        disabled={isBusy}
        onBusyChange={setGalleryBusy}
        onChange={setGalleryValue}
        onError={(message) => {
          setLocalError(message);
        }}
      />

      <input
        type="hidden"
        name="product_category_slug"
        value={categorySlug}
        readOnly
      />

      {showCategorySelector ? (
        <ProductCategorySelector
          id="quick-product-category"
          rubroLabel={productFormConfig.rubroLabel}
          categories={productFormConfig.productCategories}
          categorySlug={categorySlug}
          customCategoryName={customCategoryName}
          onCategorySlugChange={handleCategoryManualChange}
          onCustomCategoryNameChange={setCustomCategoryName}
          labelClassName="payment-field-label"
          selectClassName="payment-field-input"
        />
      ) : null}

      {!isRopaModa &&
      !isAlimentos &&
      !isTecnologia &&
      !isColeccionables &&
      !isSaludBelleza &&
      !isPapeleria &&
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

      {pcBuilderEnabled ? (
        <PCBuilderSlotField
          value={pcBuilderSlot}
          onChange={(slot) => {
            setPcBuilderSlot(slot);
            if (slot) {
              const primarySlug = getPrimaryCategorySlugForPCBuilderSlot(slot);
              if (primarySlug) setCategorySlug(primarySlug);
            }
          }}
          disabled={isBusy}
          variant="compact"
          id="quick-pc-builder-slot"
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

      {isPapeleria ? (
        <RubroStationerySection
          rubro={productFormConfig.rubroTienda}
          categorySlug={categorySlug}
          categoryLabel={categoryLabel}
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

      {!hasCustomVariants || stationeryUnifiedStock ? (
        <>
          {stationeryUnifiedStock ? (
            <StationeryStockHint extraFields={extraFields} stockQuantity={0} />
          ) : null}
          <LocationStockFields inputId="quick-stock" />
        </>
      ) : (
        <LocationStockFields hidden />
      )}

      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900/50"
          aria-expanded={advancedOpen}
        >
          <span className="min-w-0">
            <span className="block">Ajustes avanzados</span>
            <span className="mt-0.5 block text-xs font-normal text-zinc-500 dark:text-zinc-400">
              Descripciones, ofertas, mayorista y alerta de stock
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
              advancedOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>

        <div
          className={cn(
            "space-y-4 border-t border-zinc-200/80 px-4 py-4 dark:border-zinc-800",
            !advancedOpen && "hidden",
          )}
        >
          <div>
            <Label htmlFor="quick-description" className="payment-field-label">
              Descripción
            </Label>
            <Textarea
              id="quick-description"
              name="description"
              maxLength={1800}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beneficios, materiales, uso…"
              disabled={isBusy}
              className="payment-field-input mt-1.5 min-h-[5.5rem] resize-y leading-relaxed"
            />
          </div>

          <div>
            <Label
              htmlFor="quick-short-description"
              className="payment-field-label"
            >
              Descripción corta
            </Label>
            <Input
              id="quick-short-description"
              name="short_description"
              maxLength={160}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Aparece en el listado del catálogo"
              disabled={isBusy}
              className="payment-field-input mt-1.5"
            />
          </div>

          <ProductCompareAtField
            priceUsd={priceUsd}
            compareAtUsd={compareAtUsd}
            onCompareAtUsdChange={setCompareAtUsd}
            disabled={isBusy}
            variant="compact"
            idPrefix="quick-compare-at"
          />

          {wholesaleEnabled ? (
            <ProductWholesaleField
              priceUsd={priceUsd}
              wholesalePriceUsd={wholesalePriceUsd}
              wholesaleMinQty={wholesaleMinQty}
              onWholesalePriceUsdChange={setWholesalePriceUsd}
              onWholesaleMinQtyChange={setWholesaleMinQty}
              disabled={isBusy}
              variant="compact"
              idPrefix="quick-wholesale"
            />
          ) : null}

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
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              Se marca en rojo en el inventario cuando el stock sea igual o
              menor a este valor.
            </p>
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
      </div>

      {!hasGallery && !galleryBusy && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Sube al menos una foto para habilitar la publicación.
        </p>
      )}

      {galleryBusy && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Procesando fotos… podrás publicar en un momento.
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
          {submitting && saveIntentRef.current === "another" ? (
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
          {submitting && saveIntentRef.current === "close" ? (
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
