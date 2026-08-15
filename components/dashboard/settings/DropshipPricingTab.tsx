"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  Check,
  Link2,
  Loader2,
  Package,
  PackagePlus,
  Search,
  Unlink,
} from "lucide-react";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { SettingsOptionCard } from "@/components/dashboard/settings/SettingsOptionCard";
import { saveDropshipPricingSettings } from "@/lib/settings/actions";
import {
  formatDropshipMarginLabel,
  suggestRetailFromWholesaleCost,
} from "@/lib/dropship/margin";
import type { DropshipPricingSettings } from "@/lib/store-settings/types";
import { formatUsd } from "@/lib/format";
import { supplierCategoryLabel } from "@/lib/supplier/categories";
import {
  importSupplierProductToStoreCatalog,
  linkStoreDropshipProduct,
  listActiveSupplierCatalogForMerchant,
  listStoreDropshipLinks,
  unlinkStoreDropshipProduct,
  type DropshipLinkRow,
  type MerchantSupplierCatalogProduct,
} from "@/lib/dropship/actions";

interface DropshipPricingTabProps {
  initialSettings: DropshipPricingSettings;
  storeProducts: Array<{ id: string; name: string }>;
}

export function DropshipPricingTab({
  initialSettings,
  storeProducts,
}: DropshipPricingTabProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [links, setLinks] = useState<DropshipLinkRow[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<
    MerchantSupplierCatalogProduct[]
  >([]);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [storeProductId, setStoreProductId] = useState(
    storeProducts[0]?.id ?? "",
  );
  const [supplierProductId, setSupplierProductId] = useState("");
  const [showAdvancedLink, setShowAdvancedLink] = useState(false);
  const [pending, startTransition] = useTransition();

  const previewCost = useMemo(() => {
    const selected = supplierProducts.find((p) => p.id === supplierProductId);
    return selected?.basePriceUsd ?? 10;
  }, [supplierProductId, supplierProducts]);

  const previewRetail = useMemo(
    () => suggestRetailFromWholesaleCost(previewCost, settings),
    [previewCost, settings],
  );

  const filteredCatalog = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    if (!query) return supplierProducts;
    return supplierProducts.filter((product) => {
      const category = supplierCategoryLabel(product.category).toLowerCase();
      return (
        product.title.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        category.includes(query)
      );
    });
  }, [catalogQuery, supplierProducts]);

  const linkedCount = links.length;
  const availableCount = supplierProducts.filter((p) => !p.alreadyImported)
    .length;

  function refreshLinks() {
    startTransition(async () => {
      const [listed, catalog] = await Promise.all([
        listStoreDropshipLinks(),
        listActiveSupplierCatalogForMerchant(),
      ]);
      if (listed.links) setLinks(listed.links);
      if (catalog.products) {
        setSupplierProducts(catalog.products);
        if (!supplierProductId && catalog.products[0]) {
          setSupplierProductId(catalog.products[0].id);
        }
      }
      if (listed.error || catalog.error) {
        setError(listed.error ?? catalog.error ?? null);
      }
    });
  }

  useEffect(() => {
    refreshLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial
  }, []);

  function persist(next: DropshipPricingSettings) {
    const previous = settings;
    setSettings(next);
    setSaving(true);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveDropshipPricingSettings(next);
      setSaving(false);
      if (result.error) {
        setError(result.error);
        setSettings(previous);
        return;
      }
      setMessage("Tu ganancia quedó guardada.");
      const catalog = await listActiveSupplierCatalogForMerchant();
      if (catalog.products) setSupplierProducts(catalog.products);
    });
  }

  function handleImport(supplierProductIdToImport: string) {
    if (importingId) return;
    setError(null);
    setMessage(null);
    setImportingId(supplierProductIdToImport);

    void (async () => {
      try {
        const result = await importSupplierProductToStoreCatalog(
          supplierProductIdToImport,
        );
        if (!result?.productId || result.error) {
          setError(
            result?.error ??
              "No se pudo añadir el producto. Intenta de nuevo.",
          );
          return;
        }
        setMessage(
          result.productName && result.retailUsd != null
            ? `\u201C${result.productName}\u201D ya está en tu tienda a ${formatUsd(result.retailUsd)}.`
            : "Producto añadido a tu tienda.",
        );
        const [listed, catalog] = await Promise.all([
          listStoreDropshipLinks(),
          listActiveSupplierCatalogForMerchant(),
        ]);
        if (listed.links) setLinks(listed.links);
        if (catalog.products) setSupplierProducts(catalog.products);
        if (listed.error || catalog.error) {
          setError(listed.error ?? catalog.error ?? null);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo añadir el producto. Intenta de nuevo.",
        );
      } finally {
        setImportingId(null);
      }
    })();
  }

  function handleLink() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await linkStoreDropshipProduct({
        productId: storeProductId,
        supplierProductId,
        autoReprice: settings.autoApplyOnCostChange,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage("Producto conectado con el proveedor.");
      refreshLinks();
    });
  }

  function handleUnlink(linkId: string) {
    startTransition(async () => {
      const result = await unlinkStoreDropshipProduct(linkId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage("Conexión eliminada.");
      refreshLinks();
    });
  }

  return (
    <SettingsTabShell error={error} hideSaveBar>
      <div className="mb-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Tu negocio de dropshipping, en un solo lugar
        </p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Define tu ganancia, añade productos del proveedor y revisa qué ya
          tienes en tu tienda. Los pedidos llegan a Órdenes y por WhatsApp.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
          <span>
            En tu tienda:{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {linkedCount}
            </strong>
          </span>
          <span>
            Por añadir:{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {availableCount}
            </strong>
          </span>
        </div>
        <Link
          href="/dashboard/catalogo?vista=disponibles"
          className="btn-brand mt-4 inline-flex gap-2 !min-h-10 !px-4 !text-sm"
        >
          Ver productos disponibles
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <SettingsSection
        title="Tu ganancia"
        description="Decide cuánto quieres ganar sobre el costo del proveedor. Así se calcula el precio en tu tienda."
        variant="payments"
      >
        <SettingsOptionCard
          id="dropship-enabled"
          label="Calcular mi precio de venta automáticamente"
          description="Usamos el costo del proveedor más tu ganancia para sugerir (o aplicar) el precio."
          checked={settings.enabled}
          onChange={(checked) => persist({ ...settings, enabled: checked })}
          saving={saving}
        />

        {settings.enabled ? (
          <div className="mt-4 space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label-field" htmlFor="dropship-margin-type">
                  Tipo de ganancia
                </label>
                <select
                  id="dropship-margin-type"
                  className="input-field"
                  value={settings.marginType}
                  disabled={saving}
                  onChange={(event) =>
                    persist({
                      ...settings,
                      marginType:
                        event.target.value === "fixed" ? "fixed" : "percent",
                    })
                  }
                >
                  <option value="percent">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo (USD)</option>
                </select>
              </div>
              <div>
                <label className="label-field" htmlFor="dropship-margin-value">
                  Valor
                </label>
                <input
                  id="dropship-margin-value"
                  type="number"
                  min={0}
                  step={settings.marginType === "percent" ? 1 : 0.01}
                  className="input-field"
                  value={settings.marginValue}
                  disabled={saving}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      marginValue: Number(event.target.value),
                    }))
                  }
                  onBlur={() => persist(settings)}
                />
              </div>
            </div>

            <SettingsOptionCard
              id="dropship-auto-apply"
              label="Actualizar el precio si cambia el costo del proveedor"
              description="Si lo dejas apagado, solo te avisamos con un precio sugerido."
              checked={settings.autoApplyOnCostChange}
              onChange={(checked) =>
                persist({ ...settings, autoApplyOnCostChange: checked })
              }
              saving={saving}
            />

            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Regla activa:{" "}
              <strong>{formatDropshipMarginLabel(settings)}</strong>
              {previewRetail != null ? (
                <>
                  {" "}
                  · Ejemplo: costo {formatUsd(previewCost)} → tu precio{" "}
                  {formatUsd(previewRetail)}
                </>
              ) : null}
            </p>
          </div>
        ) : null}

        {message ? (
          <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {message}
          </p>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Productos del proveedor"
        description="Añade productos listos para vender. Fotos y descripción se copian solos."
        variant="payments"
      >
        {!settings.enabled ? (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
            Al añadir un producto activamos una ganancia del 30% por defecto.
            Puedes ajustarla arriba cuando quieras.
          </p>
        ) : null}

        {supplierProducts.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            Aún no hay productos del proveedor para añadir.
          </p>
        ) : (
          <>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <input
                type="search"
                className="input-field !pl-9"
                placeholder="Buscar productos…"
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
                aria-label="Buscar productos del proveedor"
              />
            </div>

            {filteredCatalog.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                No hay coincidencias para “{catalogQuery.trim()}”.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredCatalog.map((product) => {
                  const isImporting = importingId === product.id;
                  const canImport =
                    !product.alreadyImported && importingId === null;

                  return (
                    <li
                      key={product.id}
                      className="flex flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-900">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-zinc-400">
                            <Package className="h-10 w-10" aria-hidden="true" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col gap-2 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {product.title}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {supplierCategoryLabel(product.category)}
                            {` · Disponibles: ${product.stock}`}
                          </p>
                          {product.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                              {product.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-auto space-y-0.5 text-sm">
                          {product.suggestedRetailUsd != null ? (
                            <p className="text-emerald-700 dark:text-emerald-400">
                              Tu precio{" "}
                              <strong>
                                {formatUsd(product.suggestedRetailUsd)}
                              </strong>
                            </p>
                          ) : (
                            <p className="text-zinc-500">
                              Precio al añadir a tu tienda
                            </p>
                          )}
                        </div>

                        {product.alreadyImported ? (
                          <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            Ya en tu tienda
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn-brand !min-h-9 !px-3 !text-sm"
                            onClick={() => handleImport(product.id)}
                            disabled={!canImport || isImporting}
                          >
                            {isImporting ? (
                              <Loader2
                                className="mr-2 h-4 w-4 animate-spin"
                                aria-hidden="true"
                              />
                            ) : (
                              <PackagePlus
                                className="mr-2 h-4 w-4"
                                aria-hidden="true"
                              />
                            )}
                            Añadir a mi tienda
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </SettingsSection>

      <SettingsSection
        title="Ya en tu tienda"
        description="Productos que ya conectaste con el proveedor. Los pedidos quedan en Órdenes."
        variant="payments"
      >
        {links.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Todavía no has añadido productos. Empieza desde Catálogo → Productos
            disponibles o usa la lista de arriba.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {link.productName}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Proveedor: {link.supplierProductTitle}
                    {link.suggestedRetailUsd != null
                      ? ` · Tu precio ${formatUsd(link.suggestedRetailUsd)}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-brand-outline !min-h-8 !px-2.5 !text-xs"
                  onClick={() => handleUnlink(link.id)}
                  disabled={pending}
                >
                  <Unlink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Quitar conexión
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          <button
            type="button"
            className="text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-300"
            onClick={() => setShowAdvancedLink((value) => !value)}
          >
            {showAdvancedLink
              ? "Ocultar opciones avanzadas"
              : "Opciones avanzadas: conectar un producto manualmente"}
          </button>
        </div>

        {showAdvancedLink ? (
          <div className="mt-3 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
            {storeProducts.length === 0 || supplierProducts.length === 0 ? (
              <p className="text-sm text-zinc-500">
                {storeProducts.length === 0
                  ? "Añade productos desde Catálogo → Productos disponibles primero."
                  : "Aún no hay productos del proveedor."}
              </p>
            ) : (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[10rem] flex-1">
                  <label className="label-field" htmlFor="dropship-store-product">
                    Tu producto
                  </label>
                  <select
                    id="dropship-store-product"
                    className="input-field"
                    value={storeProductId}
                    onChange={(event) => setStoreProductId(event.target.value)}
                    disabled={pending}
                  >
                    {storeProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[10rem] flex-1">
                  <label
                    className="label-field"
                    htmlFor="dropship-supplier-product"
                  >
                    Producto del proveedor
                  </label>
                  <select
                    id="dropship-supplier-product"
                    className="input-field"
                    value={supplierProductId}
                    onChange={(event) =>
                      setSupplierProductId(event.target.value)
                    }
                    disabled={pending}
                  >
                    {supplierProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title} · {formatUsd(product.basePriceUsd)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn-brand !min-h-10 !px-4 !text-sm"
                  onClick={handleLink}
                  disabled={pending || !storeProductId || !supplierProductId}
                >
                  {pending && !importingId ? (
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  Conectar
                </button>
              </div>
            )}
          </div>
        ) : null}
      </SettingsSection>
    </SettingsTabShell>
  );
}
