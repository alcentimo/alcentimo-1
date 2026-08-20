"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, RefreshCw, Save, Search, Settings2, Upload } from "lucide-react";
import {
  applySupplierGlobalMargin,
  listAdminSupplierCatalogProducts,
  publishAdminSupplierProduct,
  recalculateAllSupplierGlobalMargins,
  saveAdminSupplierWholesalePrices,
  setAdminSupplierWholesalePrice,
  setSupplierGlobalMarginRule,
  unpublishAdminSupplierProduct,
  type AdminSupplierCatalogProduct,
  type AdminSupplierMarginOption,
} from "@/lib/admin/supplier-catalog-actions";
import { AdminCriticalConfirmDialog } from "@/components/admin/AdminCriticalConfirmDialog";
import { supplierCategoryLabel } from "@/lib/supplier/categories";
import {
  formatSupplierAmountInput,
  mayoristaFromMarginPercent,
  mayoristaFromMarginUsd,
  marginPercentFromPrices,
  marginUsdFromPrices,
  parsePercentAmount,
  parseUsdAmount,
} from "@/lib/supplier/wholesale-price";
import { formatUsd } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

type StatusFilter = "all" | "draft" | "published";

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "draft", label: "Borradores" },
  { id: "published", label: "Publicados" },
];

type PriceDraft = {
  mayorista: string;
  marginUsd: string;
  marginPercent: string;
};

type ConfirmJob =
  | {
      kind: "apply-supplier";
      supplierId: string;
      supplierName: string;
      percent: number;
      productCount: number;
    }
  | {
      kind: "recalculate-all";
      supplierCount: number;
    };

function draftsFromProduct(product: AdminSupplierCatalogProduct): PriceDraft {
  const mayorista = product.precioMayoristaUsd;
  const costo = product.costoProveedorUsd;
  return {
    mayorista: formatSupplierAmountInput(mayorista),
    marginUsd:
      mayorista == null ? "" : formatSupplierAmountInput(marginUsdFromPrices(costo, mayorista)),
    marginPercent:
      mayorista == null
        ? ""
        : formatSupplierAmountInput(marginPercentFromPrices(costo, mayorista)),
  };
}

function isPriceDirty(product: AdminSupplierCatalogProduct, draft: PriceDraft): boolean {
  return parseUsdAmount(draft.mayorista) !== product.precioMayoristaUsd;
}

function MoneyInput({
  prefix,
  suffix,
  value,
  disabled,
  onChange,
  className,
}: {
  prefix?: string;
  suffix?: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative w-[7.25rem]", className)}>
      {prefix ? (
        <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-zinc-400">
          {prefix}
        </span>
      ) : null}
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-zinc-400">
          {suffix}
        </span>
      ) : null}
      <Input
        type="number"
        step="0.01"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn("h-9 text-sm", prefix && "pl-6", suffix && "pr-7")}
        placeholder="0.00"
      />
    </div>
  );
}

export function AdminSupplierCatalogPanel() {
  const [products, setProducts] = useState<AdminSupplierCatalogProduct[]>([]);
  const [suppliers, setSuppliers] = useState<AdminSupplierMarginOption[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleSupplierId, setRuleSupplierId] = useState("");
  const [rulePercent, setRulePercent] = useState("");
  const [confirmJob, setConfirmJob] = useState<ConfirmJob | null>(null);
  const [, startTransition] = useTransition();

  function hydrate(
    rows: AdminSupplierCatalogProduct[],
    options: AdminSupplierMarginOption[],
  ) {
    setProducts(rows);
    setSuppliers(options);
    setPriceDrafts(
      Object.fromEntries(rows.map((row) => [row.id, draftsFromProduct(row)])),
    );
  }

  useEffect(() => {
    startTransition(async () => {
      setLoading(true);
      setError(null);
      const result = await listAdminSupplierCatalogProducts();
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      hydrate(result.products ?? [], result.suppliers ?? []);
    });
  }, []);

  const selectedSupplier = useMemo(
    () => suppliers.find((item) => item.id === supplierFilter) ?? null,
    [suppliers, supplierFilter],
  );

  const draftCount = useMemo(
    () => products.filter((item) => item.publicationStatus === "draft").length,
    [products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (supplierFilter !== "all" && product.supplierUserId !== supplierFilter) {
        return false;
      }
      if (statusFilter !== "all" && product.publicationStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        product.title.toLowerCase().includes(q) ||
        product.supplierName.toLowerCase().includes(q) ||
        supplierCategoryLabel(product.category).toLowerCase().includes(q)
      );
    });
  }, [products, query, statusFilter, supplierFilter]);

  const dirtyProducts = useMemo(
    () =>
      products.filter((product) =>
        isPriceDirty(product, priceDrafts[product.id] ?? draftsFromProduct(product)),
      ),
    [priceDrafts, products],
  );

  useEffect(() => {
    if (dirtyProducts.length === 0) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyProducts.length]);

  const ruleTarget = useMemo((): AdminSupplierMarginOption | null => {
    if (ruleSupplierId === "all") {
      return {
        id: "all",
        name: "Todos los productos",
        productCount: products.length,
        draftCount,
        globalMarginPercent: null,
      };
    }
    return suppliers.find((item) => item.id === ruleSupplierId) ?? null;
  }, [draftCount, products.length, ruleSupplierId, suppliers]);
  const parsedRulePercent = parsePercentAmount(rulePercent, { min: 0, max: 1000 });
  const rulePreviewMayorista =
    parsedRulePercent == null
      ? null
      : mayoristaFromMarginPercent(10, parsedRulePercent);

  function replaceProduct(next: AdminSupplierCatalogProduct) {
    setProducts((current) =>
      current.map((item) => (item.id === next.id ? next : item)),
    );
    setPriceDrafts((current) => ({
      ...current,
      [next.id]: draftsFromProduct(next),
    }));
  }

  function patchDraft(product: AdminSupplierCatalogProduct, patch: Partial<PriceDraft>) {
    setPriceDrafts((current) => ({
      ...current,
      [product.id]: {
        ...(current[product.id] ?? draftsFromProduct(product)),
        ...patch,
      },
    }));
  }

  function onMayoristaChange(product: AdminSupplierCatalogProduct, raw: string) {
    const parsed = parseUsdAmount(raw);
    const costo = product.costoProveedorUsd;
    patchDraft(product, {
      mayorista: raw,
      marginUsd:
        parsed == null ? "" : formatSupplierAmountInput(marginUsdFromPrices(costo, parsed)),
      marginPercent:
        parsed == null
          ? ""
          : formatSupplierAmountInput(marginPercentFromPrices(costo, parsed)),
    });
  }

  function onMarginUsdChange(product: AdminSupplierCatalogProduct, raw: string) {
    const parsed = parseUsdAmount(raw, { min: -1_000_000 });
    const costo = product.costoProveedorUsd;
    const mayorista = parsed == null ? null : mayoristaFromMarginUsd(costo, parsed);
    patchDraft(product, {
      marginUsd: raw,
      mayorista: mayorista == null ? "" : formatSupplierAmountInput(mayorista),
      marginPercent:
        mayorista == null
          ? ""
          : formatSupplierAmountInput(marginPercentFromPrices(costo, mayorista)),
    });
  }

  function onMarginPercentChange(product: AdminSupplierCatalogProduct, raw: string) {
    const parsed = parsePercentAmount(raw);
    const costo = product.costoProveedorUsd;
    const mayorista =
      parsed == null ? null : mayoristaFromMarginPercent(costo, parsed);
    patchDraft(product, {
      marginPercent: raw,
      mayorista: mayorista == null ? "" : formatSupplierAmountInput(mayorista),
      marginUsd:
        mayorista == null
          ? ""
          : formatSupplierAmountInput(marginUsdFromPrices(costo, mayorista)),
    });
  }

  async function handleSave(product: AdminSupplierCatalogProduct, publish: boolean) {
    const raw = priceDrafts[product.id]?.mayorista ?? "";
    setBusyId(product.id);
    setError(null);
    setMessage(null);
    try {
      const result = await setAdminSupplierWholesalePrice({
        productId: product.id,
        precioMayoristaUsd: raw,
        publish,
      });
      if (result.error || !result.product) {
        setError(result.error ?? "No se pudo guardar el precio mayorista.");
        return;
      }
      replaceProduct(result.product);
      setMessage(
        publish
          ? `“${result.product.title}” publicado en el catálogo de dropshippers.`
          : `Precio mayorista guardado para “${result.product.title}”.`,
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveAll() {
    if (dirtyProducts.length === 0) return;
    setBulkBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await saveAdminSupplierWholesalePrices(
        dirtyProducts.map((product) => ({
          productId: product.id,
          precioMayoristaUsd: priceDrafts[product.id]?.mayorista ?? "",
        })),
      );
      if (result.products) {
        setProducts((current) => {
          const byId = new Map(result.products!.map((item) => [item.id, item]));
          return current.map((item) => byId.get(item.id) ?? item);
        });
        setPriceDrafts((current) => {
          const next = { ...current };
          for (const product of result.products ?? []) {
            next[product.id] = draftsFromProduct(product);
          }
          return next;
        });
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(
        `${result.saved ?? 0} precio(s) mayorista(s) guardado(s) en la base de datos.`,
      );
    } finally {
      setBulkBusy(false);
    }
  }

  async function handlePublish(product: AdminSupplierCatalogProduct) {
    const draft = priceDrafts[product.id] ?? draftsFromProduct(product);
    if (isPriceDirty(product, draft) || product.precioMayoristaUsd == null) {
      await handleSave(product, true);
      return;
    }
    setBusyId(product.id);
    setError(null);
    setMessage(null);
    try {
      const result = await publishAdminSupplierProduct(product.id);
      if (result.error || !result.product) {
        setError(result.error ?? "No se pudo publicar el producto.");
        return;
      }
      replaceProduct(result.product);
      setMessage(`“${result.product.title}” ya es visible para dropshippers.`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnpublish(product: AdminSupplierCatalogProduct) {
    const draft = priceDrafts[product.id] ?? draftsFromProduct(product);
    if (isPriceDirty(product, draft) && parseUsdAmount(draft.mayorista) != null) {
      setBusyId(product.id);
      setError(null);
      setMessage(null);
      try {
        const saved = await setAdminSupplierWholesalePrice({
          productId: product.id,
          precioMayoristaUsd: draft.mayorista,
          publish: false,
        });
        if (saved.error || !saved.product) {
          setError(saved.error ?? "No se pudo guardar el precio mayorista.");
          return;
        }
        replaceProduct(saved.product);
        const result = await unpublishAdminSupplierProduct(product.id);
        if (result.error || !result.product) {
          setError(result.error ?? "No se pudo pasar a borrador.");
          return;
        }
        replaceProduct(result.product);
        setMessage(`“${result.product.title}” volvió a borrador. El precio quedó guardado.`);
      } finally {
        setBusyId(null);
      }
      return;
    }
    setBusyId(product.id);
    setError(null);
    setMessage(null);
    try {
      const result = await unpublishAdminSupplierProduct(product.id);
      if (result.error || !result.product) {
        setError(result.error ?? "No se pudo pasar a borrador.");
        return;
      }
      replaceProduct(result.product);
      setMessage(`“${result.product.title}” volvió a borrador y ya no es visible para dropshippers.`);
    } finally {
      setBusyId(null);
    }
  }

  function openRuleModal(supplierId?: string) {
    const nextId =
      supplierId || (supplierFilter !== "all" ? supplierFilter : "all");
    const option =
      nextId === "all"
        ? null
        : suppliers.find((item) => item.id === nextId);
    const sharedPercent =
      nextId === "all" &&
      suppliers.length > 0 &&
      suppliers.every(
        (item) =>
          item.globalMarginPercent != null &&
          item.globalMarginPercent === suppliers[0]?.globalMarginPercent,
      )
        ? suppliers[0]?.globalMarginPercent
        : null;
    setRuleSupplierId(nextId);
    setRulePercent(
      option?.globalMarginPercent != null
        ? String(option.globalMarginPercent)
        : sharedPercent != null
          ? String(sharedPercent)
          : "",
    );
    setError(null);
    setRuleOpen(true);
  }

  function handleSaveRuleOnly() {
    if (!ruleSupplierId || parsedRulePercent == null) {
      setError("Indica el porcentaje de ganancia de Alcéntimo.");
      return;
    }
    setBulkBusy(true);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await setSupplierGlobalMarginRule({
        supplierUserId: ruleSupplierId,
        marginPercent: parsedRulePercent,
      });
      setBulkBusy(false);
      if (result.error || !result.supplier) {
        setError(result.error ?? "No se pudo guardar la regla.");
        return;
      }
      setSuppliers((current) =>
        result.supplier!.id === "all"
          ? current.map((item) => ({
              ...item,
              globalMarginPercent: parsedRulePercent,
            }))
          : current.map((item) =>
              item.id === result.supplier!.id ? result.supplier! : item,
            ),
      );
      setRuleOpen(false);
      setMessage(
        result.supplier.id === "all"
          ? `Margen de Alcéntimo de ${parsedRulePercent}% guardado. Los productos no se modificaron.`
          : `Margen de Alcéntimo de ${result.supplier.globalMarginPercent}% guardado para ${result.supplier.name}. Los productos no se modificaron.`,
      );
    });
  }

  function requestApplyRule() {
    if (!ruleTarget || parsedRulePercent == null) {
      setError("Indica el porcentaje de ganancia de Alcéntimo.");
      return;
    }
    setConfirmJob({
      kind: "apply-supplier",
      supplierId: ruleTarget.id,
      supplierName: ruleTarget.name,
      percent: parsedRulePercent,
      productCount: ruleTarget.productCount,
    });
  }

  function requestRecalculate() {
    if (selectedSupplier) {
      if (selectedSupplier.globalMarginPercent == null) {
        openRuleModal(selectedSupplier.id);
        return;
      }
      setConfirmJob({
        kind: "apply-supplier",
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        percent: selectedSupplier.globalMarginPercent,
        productCount: selectedSupplier.productCount,
      });
      return;
    }
    const withRules = suppliers.filter((item) => item.globalMarginPercent != null);
    if (withRules.length === 0 || withRules.length !== suppliers.length) {
      openRuleModal("all");
      return;
    }
    setConfirmJob({
      kind: "recalculate-all",
      supplierCount: withRules.length,
    });
  }

  function runConfirmedJob() {
    if (!confirmJob) return;
    setBulkBusy(true);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      if (confirmJob.kind === "apply-supplier") {
        const result = await applySupplierGlobalMargin({
          supplierUserId: confirmJob.supplierId,
          marginPercent: confirmJob.percent,
        });
        setBulkBusy(false);
        setConfirmJob(null);
        setRuleOpen(false);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.products && result.suppliers) {
          hydrate(result.products, result.suppliers);
        }
        setMessage(
          `Margen de Alcéntimo de ${result.marginPercent}% aplicado a ${confirmJob.supplierName}: ${result.updated ?? 0} producto(s) actualizado(s).`,
        );
        return;
      }

      const result = await recalculateAllSupplierGlobalMargins();
      setBulkBusy(false);
      setConfirmJob(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.products && result.suppliers) {
        hydrate(result.products, result.suppliers);
      }
      setMessage(
        `Recálculo global: ${result.updated ?? 0} producto(s) en ${result.supplierCount ?? 0} proveedor(es).`,
      );
    });
  }

  const busy = bulkBusy || busyId != null;

  return (
    <div className="space-y-4">
      <div className="admin-stores-toolbar">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Productos de proveedores
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            El proveedor solo sube el costo. Aquí aparecen todos sus productos
            de inmediato: tú pones el precio mayorista, pulsas{" "}
            <strong>Guardar</strong> y decides si queda en{" "}
            <strong>Borrador</strong> o <strong>Publicado</strong>. Solo los
            publicados se ven en el catálogo de dropshippers; el costo nunca.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="admin-supplier-filter" className="text-xs text-zinc-500">
              Proveedor
            </Label>
            <select
              id="admin-supplier-filter"
              value={supplierFilter}
              onChange={(event) => setSupplierFilter(event.target.value)}
              className="input-field mt-1.5"
            >
              <option value="all">Todos los proveedores</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                  {supplier.globalMarginPercent != null
                    ? ` · ${supplier.globalMarginPercent}%`
                    : ""}
                  {` (${supplier.productCount})`}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-stores-search sm:mt-6">
            <Search className="admin-stores-search-icon" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar producto o categoría"
              className="admin-stores-search-input"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || products.length === 0}
            onClick={() => openRuleModal()}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Margen global
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || products.length === 0}
            onClick={requestRecalculate}
          >
            {bulkBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Recalcular
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy || dirtyProducts.length === 0}
            onClick={() => void handleSaveAll()}
          >
            {bulkBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Guardar cambios
            {dirtyProducts.length > 0 ? ` (${dirtyProducts.length})` : ""}
          </Button>
          {selectedSupplier?.globalMarginPercent != null ? (
            <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-200">
              Nuestro margen: {selectedSupplier.globalMarginPercent}% sobre
              costo
            </span>
          ) : selectedSupplier ? (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              Sin margen nuestro · edita cada producto o usa Margen global
            </span>
          ) : null}
        </div>

        <div className="admin-stores-toolbar-meta">
          <div className="admin-stores-quick-filters">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={cn(
                  "admin-stores-chip",
                  statusFilter === filter.id && "admin-stores-chip-active",
                )}
              >
                {filter.label}
                {filter.id === "draft" && draftCount > 0 ? ` (${draftCount})` : ""}
              </button>
            ))}
          </div>
          <p className="admin-stores-result-count">
            {filtered.length} producto{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          {message}
        </p>
      ) : null}

      {loading && products.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando productos de proveedores…
        </p>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            No hay productos de proveedores todavía.
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            En cuanto un proveedor suba un producto con su costo, aparece aquí
            para que definas el precio mayorista. No hace falta ningún margen
            previo.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          No hay coincidencias con este filtro.
        </p>
      ) : (
        <div className="admin-stores-table-shell">
          <div className="admin-stores-table-scroll">
            <table className="admin-stores-table">
              <thead>
                <tr>
                  <th className="admin-stores-th">Producto</th>
                  <th className="admin-stores-th">Proveedor</th>
                  <th className="admin-stores-th">Costo proveedor</th>
                  <th className="admin-stores-th">Precio mayorista</th>
                  <th className="admin-stores-th">Margen ($)</th>
                  <th className="admin-stores-th">Margen (%)</th>
                  <th className="admin-stores-th sticky right-0 z-[1] min-w-[16.5rem] max-w-none bg-zinc-50/95 shadow-[-12px_0_12px_-12px_rgba(24,24,27,0.18)] dark:bg-zinc-900/95">
                    Guardar y publicar
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const rowBusy = busyId === product.id || bulkBusy;
                  const draft = priceDrafts[product.id] ?? draftsFromProduct(product);
                  const dirty = isPriceDirty(product, draft);
                  const liveMayorista = parseUsdAmount(draft.mayorista);
                  const liveMargin =
                    liveMayorista == null
                      ? product.marginUsd
                      : marginUsdFromPrices(product.costoProveedorUsd, liveMayorista);
                  const published = product.publicationStatus === "published";
                  return (
                    <tr
                      key={product.id}
                      className={cn(
                        "border-b border-zinc-100 dark:border-zinc-800",
                        dirty && "bg-amber-50/60 dark:bg-amber-950/20",
                      )}
                    >
                      <td className="admin-stores-td">
                        <div className="flex min-w-[220px] items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
                            {product.imageUrl ? (
                              <Image
                                src={product.imageUrl}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                              {product.title}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {supplierCategoryLabel(product.category)} · Stock{" "}
                              {product.stock}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="admin-stores-td text-zinc-600 dark:text-zinc-300">
                        {product.supplierName}
                      </td>
                      <td className="admin-stores-td font-medium text-zinc-900 dark:text-zinc-50">
                        {formatUsd(product.costoProveedorUsd)}
                      </td>
                      <td className="admin-stores-td">
                        <MoneyInput
                          prefix="$"
                          value={draft.mayorista}
                          disabled={rowBusy}
                          onChange={(value) => onMayoristaChange(product, value)}
                        />
                      </td>
                      <td className="admin-stores-td">
                        <MoneyInput
                          prefix="$"
                          value={draft.marginUsd}
                          disabled={rowBusy}
                          onChange={(value) => onMarginUsdChange(product, value)}
                        />
                        {liveMargin != null && liveMargin < 0 ? (
                          <p className="mt-1 text-[10px] font-medium text-red-600">
                            Bajo costo
                          </p>
                        ) : null}
                      </td>
                      <td className="admin-stores-td">
                        <MoneyInput
                          suffix="%"
                          value={draft.marginPercent}
                          disabled={rowBusy || product.costoProveedorUsd <= 0}
                          onChange={(value) => onMarginPercentChange(product, value)}
                        />
                      </td>
                      <td
                        className={cn(
                          "admin-stores-td sticky right-0 z-[1] !max-w-none shadow-[-12px_0_12px_-12px_rgba(24,24,27,0.18)]",
                          dirty
                            ? "bg-amber-50 dark:bg-amber-950/40"
                            : "bg-white dark:bg-zinc-950",
                        )}
                      >
                        <div className="flex min-w-[15.5rem] flex-col gap-2 py-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {published ? (
                              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
                                Publicado
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                                Borrador
                              </span>
                            )}
                            {dirty ? (
                              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                Sin guardar
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={dirty ? "default" : "outline"}
                              disabled={rowBusy || !dirty}
                              onClick={() => void handleSave(product, false)}
                            >
                              {busyId === product.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              {product.precioMayoristaUsd == null
                                ? "Guardar"
                                : "Actualizar"}
                            </Button>
                            {published ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={rowBusy}
                                onClick={() => void handleUnpublish(product)}
                              >
                                Pasar a borrador
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                disabled={rowBusy || liveMayorista == null}
                                onClick={() => void handlePublish(product)}
                              >
                                {busyId === product.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Upload className="h-3.5 w-3.5" />
                                )}
                                Publicar
                              </Button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={ruleOpen} onOpenChange={setRuleOpen} dismissible={!bulkBusy}>
        <DialogContent onClose={bulkBusy ? undefined : () => setRuleOpen(false)}>
          <DialogHeader>
            <DialogTitle>Margen de Alcéntimo</DialogTitle>
            <DialogDescription>
              Este porcentaje lo definimos nosotros, no el proveedor. Precio
              mayorista = costo × (1 + %). Puedes guardarlo o aplicarlo ya a
              todos los productos del alcance elegido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="rule-supplier">Alcance</Label>
              <select
                id="rule-supplier"
                value={ruleSupplierId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  const option = suppliers.find((item) => item.id === nextId);
                  setRuleSupplierId(nextId);
                  const sharedPercent =
                    nextId === "all" &&
                    suppliers.length > 0 &&
                    suppliers.every(
                      (item) =>
                        item.globalMarginPercent != null &&
                        item.globalMarginPercent ===
                          suppliers[0]?.globalMarginPercent,
                    )
                      ? suppliers[0]?.globalMarginPercent
                      : null;
                  setRulePercent(
                    option?.globalMarginPercent != null
                      ? String(option.globalMarginPercent)
                      : sharedPercent != null
                        ? String(sharedPercent)
                        : "",
                  );
                }}
                className="input-field mt-1.5"
                disabled={bulkBusy}
              >
                <option value="all">Todos los productos</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} ({supplier.productCount} productos)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="rule-percent">Nuestro margen (%)</Label>
              <div className="relative mt-1.5">
                <Input
                  id="rule-percent"
                  type="number"
                  min={0}
                  max={1000}
                  step="0.01"
                  inputMode="decimal"
                  value={rulePercent}
                  disabled={bulkBusy}
                  onChange={(event) => setRulePercent(event.target.value)}
                  className="pr-8"
                  placeholder="15"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-400">
                  %
                </span>
              </div>
            </div>
            {ruleTarget && parsedRulePercent != null ? (
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                Ejemplo: costo {formatUsd(10)} → precio mayorista{" "}
                <strong>{formatUsd(rulePreviewMayorista)}</strong>
                . Se aplicaría a {ruleTarget.productCount} producto
                {ruleTarget.productCount === 1 ? "" : "s"}
                {ruleTarget.id === "all"
                  ? "."
                  : ` de ${ruleTarget.name}.`}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={bulkBusy}
              onClick={() => setRuleOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={bulkBusy || !ruleSupplierId || parsedRulePercent == null}
              onClick={handleSaveRuleOnly}
            >
              Guardar regla
            </Button>
            <Button
              type="button"
              disabled={bulkBusy || !ruleTarget || parsedRulePercent == null}
              onClick={requestApplyRule}
            >
              Guardar y aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminCriticalConfirmDialog
        open={confirmJob != null}
        onOpenChange={(open) => {
          if (!open && !bulkBusy) setConfirmJob(null);
        }}
        title={
          confirmJob?.kind === "recalculate-all"
            ? "Recalcular precios mayoristas"
            : "Aplicar margen de Alcéntimo"
        }
        impact={
          confirmJob?.kind === "recalculate-all"
            ? `Se recalculará precio mayorista = costo × (1 + nuestro %) en los productos de ${confirmJob.supplierCount} proveedor(es) con un margen de Alcéntimo ya guardado. Los productos publicados notificarán el nuevo precio a dropshippers vinculados.`
            : confirmJob
              ? `Se actualizará el precio mayorista de ${confirmJob.productCount} producto(s) de ${confirmJob.supplierName} con nuestro margen de ${confirmJob.percent}%. El proveedor no interviene: fórmula costo × (1 + ${confirmJob.percent}%).`
              : ""
        }
        confirmLabel="Aplicar recálculo"
        loading={bulkBusy}
        onConfirm={runConfirmedJob}
      />
    </div>
  );
}
