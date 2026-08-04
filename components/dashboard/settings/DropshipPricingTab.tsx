"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Link2, Loader2, Unlink } from "lucide-react";
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
  linkStoreDropshipProduct,
  listActiveSupplierCatalogForMerchant,
  listStoreDropshipLinks,
  unlinkStoreDropshipProduct,
  type DropshipLinkRow,
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
    Array<{
      id: string;
      title: string;
      basePriceUsd: number;
      stock: number;
      category: string;
    }>
  >([]);
  const [storeProductId, setStoreProductId] = useState(
    storeProducts[0]?.id ?? "",
  );
  const [supplierProductId, setSupplierProductId] = useState("");
  const [pending, startTransition] = useTransition();

  const previewCost = useMemo(() => {
    const selected = supplierProducts.find((p) => p.id === supplierProductId);
    return selected?.basePriceUsd ?? 10;
  }, [supplierProductId, supplierProducts]);

  const previewRetail = useMemo(
    () => suggestRetailFromWholesaleCost(previewCost, settings),
    [previewCost, settings],
  );

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
      setMessage("Regla de margen guardada.");
    });
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
      setMessage("Producto vinculado al mayorista.");
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
      setMessage("Vínculo eliminado.");
      refreshLinks();
    });
  }

  return (
    <SettingsTabShell error={error} hideSaveBar>
      <SettingsSection
        title="Dropshipping · margen automático"
        description="Protege tu margen cuando el mayorista cambia el costo. Las órdenes ya emitidas conservan el costo histórico; el catálogo puede recalcularse o sugerirte el nuevo precio."
        variant="payments"
      >
        <SettingsOptionCard
          id="dropship-enabled"
          label="Activar regla de margen sobre costo mayorista"
          description="Calcula un precio de venta sugerido (o automático) a partir del costo del proveedor."
          checked={settings.enabled}
          onChange={(checked) => persist({ ...settings, enabled: checked })}
          saving={saving}
        />

        {settings.enabled ? (
          <div className="mt-4 space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label-field" htmlFor="dropship-margin-type">
                  Tipo de margen
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
                  Valor del margen
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
              label="Aplicar automáticamente el nuevo precio de venta"
              description="Si el mayorista sube o baja el costo, se actualiza el precio de tus productos vinculados. Si lo dejas apagado, solo recibirás una alerta con el precio sugerido."
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
                  · Ejemplo: costo {formatUsd(previewCost)} → venta sugerida{" "}
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
        title="Productos vinculados"
        description="Asocia un producto de tu tienda con el SKU del mayorista para congelar costos en órdenes y recibir alertas de cambio de precio."
        variant="payments"
      >
        {storeProducts.length === 0 || supplierProducts.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {storeProducts.length === 0
              ? "Primero crea productos en tu catálogo."
              : "Aún no hay productos en el hub de proveedores."}
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
              <label className="label-field" htmlFor="dropship-supplier-product">
                Producto mayorista
              </label>
              <select
                id="dropship-supplier-product"
                className="input-field"
                value={supplierProductId}
                onChange={(event) => setSupplierProductId(event.target.value)}
                disabled={pending}
              >
                {supplierProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title} · {formatUsd(product.basePriceUsd)} ·{" "}
                    {supplierCategoryLabel(product.category)}
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
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Vincular
            </button>
          </div>
        )}

        {links.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No hay vínculos todavía. Al vincular, los pedidos de tu tienda
            guardarán el costo del mayorista en cada línea.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-emerald-50 overflow-hidden rounded-xl border border-emerald-100 bg-white dark:divide-emerald-950/40 dark:border-emerald-900/40 dark:bg-zinc-950">
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
                    Mayorista: {link.supplierProductTitle} · Costo{" "}
                    {formatUsd(link.supplierCostUsd)}
                    {link.suggestedRetailUsd != null
                      ? ` · Sugerido ${formatUsd(link.suggestedRetailUsd)}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-brand-outline !min-h-8 !px-2.5 !text-xs"
                  onClick={() => handleUnlink(link.id)}
                  disabled={pending}
                >
                  <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>
    </SettingsTabShell>
  );
}
