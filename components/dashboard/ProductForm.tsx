"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  createProduct,
  updateProduct,
  type ProductEditData,
  type ProductFormState,
} from "@/lib/products/actions";
import {
  buildProductImagesFormPayload,
  ProductGalleryField,
  type ProductGalleryFieldValue,
} from "@/components/dashboard/ProductGalleryField";
import { ProductSubmitOverlay } from "@/components/dashboard/ProductSubmitOverlay";
import type { Store } from "@/lib/database.types";
import { getStoreCatalogUrl } from "@/lib/stores";
import { formatUsd, formatExchangeRate } from "@/lib/format";
import { formatCountryCurrency } from "@/lib/country-config";
import { useCountry } from "@/components/providers/CountryProvider";
import {
  RubroVariantsSection,
} from "@/components/rubros/RubroVariantsSection";
import { RubroModifiersSection } from "@/components/rubros/RubroModifiersSection";
import { RubroTechSpecsSection } from "@/components/rubros/RubroTechSpecsSection";
import { RubroCollectibleSection } from "@/components/rubros/RubroCollectibleSection";
import { RubroBeautySection } from "@/components/rubros/RubroBeautySection";
import { serializeVariantsForForm } from "@/components/dashboard/ProductVariantsEditor";
import { ProductExtraFieldsSection } from "@/components/dashboard/ProductExtraFieldsSection";
import { serializeExtraFieldsJson } from "@/lib/products/extra-fields";
import type { VariantFormInput } from "@/lib/products/variants";
import type { StoreProductFormConfig } from "@/lib/products/store-field-config";
import { useProductCategoryFields } from "@/components/dashboard/useProductCategoryFields";
import { storeUsesRubroProductModule } from "@/lib/rubros/registry";
import { ProductCompareAtField } from "@/components/dashboard/ProductCompareAtField";
import { LocationStockFields } from "@/components/dashboard/LocationStockFields";
import { ProductCopyAiFields } from "@/components/dashboard/ProductCopyAiFields";
import {
  emptyFoodModifiers,
  serializeFoodModifiersJson,
  type FoodModifiersConfig,
} from "@/lib/rubros/modules/alimentos";

interface ProductFormProps {
  store: Store;
  exchangeRate: number | null;
  productFormConfig: StoreProductFormConfig;
  mode?: "create" | "edit";
  initialData?: ProductEditData;
}

const initialState: ProductFormState = {};

function toVariantInputs(
  variants: ProductEditData["variants"],
): VariantFormInput[] {
  return variants.map((variant) => ({
    id: variant.id,
    name: variant.name,
    priceExtraUsd: String(variant.price_extra_usd),
    stock: String(variant.stock),
    attributes: variant.attributes,
  }));
}

export function ProductForm({
  store,
  exchangeRate,
  productFormConfig,
  mode = "create",
  initialData,
}: ProductFormProps) {
  const { config: countryConfig } = useCountry();
  const action = mode === "edit" ? updateProduct : createProduct;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [priceUsd, setPriceUsd] = useState(
    initialData ? String(initialData.priceUsd) : "",
  );
  const [compareAtUsd, setCompareAtUsd] = useState(
    initialData?.compareAtUsd != null ? String(initialData.compareAtUsd) : "",
  );
  const [variants, setVariants] = useState<VariantFormInput[]>(
    initialData ? toVariantInputs(initialData.variants) : [],
  );
  const [foodModifiers, setFoodModifiers] = useState<FoodModifiersConfig>(
    () => initialData?.foodModifiers ?? emptyFoodModifiers(),
  );
  const [galleryValue, setGalleryValue] = useState<ProductGalleryFieldValue>({
    items: [],
    removedDbIds: [],
  });
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [galleryReady, setGalleryReady] = useState(
    mode === "edit" && (initialData?.images.length ?? 0) > 0,
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [productName, setProductName] = useState(initialData?.name ?? "");
  const [shortDescription, setShortDescription] = useState(
    initialData?.shortDescription ?? "",
  );
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const {
    categorySlug,
    fieldLabels,
    categoryLabel,
    extraFields,
    setExtraFields,
  } = useProductCategoryFields(
    productFormConfig,
    initialData?.categorySlug,
    initialData?.extraFields,
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
  const isColeccionables = storeUsesRubroProductModule(
    productFormConfig.rubroTienda,
    "coleccionables",
  );
  const isSaludBelleza = storeUsesRubroProductModule(
    productFormConfig.rubroTienda,
    "salud-belleza",
  );
  const catalogUrl = getStoreCatalogUrl(store.slug);
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);

    if (galleryValue.items.length === 0) {
      setLocalError("Agrega al menos una foto del producto.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("product_category_slug", categorySlug);
    formData.set("custom_category_name", "");
    formData.set(
      "variants_json",
      serializeVariantsForForm(
        variants,
        initialData?.variants.map((variant) => variant.id),
      ),
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
  const requiresNewImage = mode === "create";
  const submitDisabled =
    isBusy || (requiresNewImage && !galleryReady);

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
              href="/dashboard/catalogo"
              className="btn-secondary w-full sm:w-auto"
            >
              Volver al catálogo
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <ProductSubmitOverlay
        visible={pending}
        hasImage={galleryValue.items.some((item) => item.file) || galleryValue.removedDbIds.length > 0}
        mode={mode}
      />
      <form
        onSubmit={handleSubmit}
        encType="multipart/form-data"
        className="space-y-5"
      >
      <input type="hidden" name="store_id" value={store.id} readOnly />
      <input
        type="hidden"
        name="product_category_slug"
        value={categorySlug}
        readOnly
      />
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
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Rubro: {productFormConfig.rubroLabel}
        </p>
        <Link
          href={catalogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link-brand mt-1 inline-block text-sm"
        >
          {catalogUrl}
        </Link>
      </div>

      <ProductCopyAiFields
        idPrefix="product"
        name={productName}
        onNameChange={setProductName}
        shortDescription={shortDescription}
        onShortDescriptionChange={setShortDescription}
        description={description}
        onDescriptionChange={setDescription}
        storeRubro={productFormConfig.rubroTienda}
        categoryLabel={categoryLabel}
        disabled={isBusy}
        variant="default"
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="price_usd" className="label-field">
            {countryConfig.currency.baseCurrencyLabel}{" "}
            <span className="text-red-500">*</span>
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

        {countryConfig.currency.showLocalEquivalent && (
          <div>
            <p className="label-field">{countryConfig.currency.localCurrencyLabel}</p>
            <div className="price-box mt-1.5 flex min-h-11 items-center !p-3.5">
              <span className="text-base font-semibold text-teal-800 md:text-sm dark:text-teal-200">
                {priceLocal != null
                  ? formatCountryCurrency(
                      priceLocal,
                      countryConfig.currency.localCurrency,
                      countryConfig.currency.locale,
                    )
                  : "—"}
              </span>
            </div>
            {exchangeRate && (
              <p className="mt-1.5">
                <span className="price-rate-badge">
                  Bs. {formatExchangeRate(exchangeRate)} / USD ·{" "}
                  {formatUsd(parseFloat(priceUsd) || 0)}
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      <ProductCompareAtField
        priceUsd={priceUsd}
        compareAtUsd={compareAtUsd}
        onCompareAtUsdChange={setCompareAtUsd}
        disabled={pending}
        variant="default"
        idPrefix="product-compare-at"
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
        />
      ) : null}

      {isColeccionables ? (
        <RubroCollectibleSection
          rubro={productFormConfig.rubroTienda}
          values={extraFields}
          onChange={setExtraFields}
          disabled={isBusy}
        />
      ) : null}

      {isSaludBelleza ? (
        <RubroBeautySection
          rubro={productFormConfig.rubroTienda}
          values={extraFields}
          onChange={setExtraFields}
          disabled={isBusy}
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

      {!hasCustomVariants ? (
        <LocationStockFields defaultStock={initialData?.stockQuantity ?? 0} />
      ) : (
        <LocationStockFields hidden />
      )}

      <div>
        <label htmlFor="low_stock_threshold" className="label-field">
          Umbral de alerta de stock
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
          El producto se marcará en rojo en el dashboard cuando el stock sea igual o menor a este valor.
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

      <ProductGalleryField
        key={initialData?.productId ?? "create"}
        id="image"
        mode={mode}
        layout="stacked"
        initialImages={initialData?.images ?? []}
        disabled={pending}
        onBusyChange={setGalleryBusy}
        onReadyChange={setGalleryReady}
        onChange={setGalleryValue}
        onError={(message) => {
          setLocalError(message);
        }}
      />

      {requiresNewImage && !galleryReady && !galleryBusy && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Sube al menos una foto del producto para habilitar la publicación.
        </p>
      )}

      {displayError && <p className="alert-error">{displayError}</p>}

      <button type="submit" disabled={submitDisabled} className="btn-primary">
        {pending
          ? mode === "edit"
            ? "Guardando cambios…"
            : "Publicando producto…"
          : mode === "edit"
            ? "Guardar cambios"
            : galleryBusy
              ? "Procesando fotos…"
              : "Publicar producto"}
      </button>
    </form>
    </>
  );
}
