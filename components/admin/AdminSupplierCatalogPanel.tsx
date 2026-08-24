"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ExternalLink, Loader2, Search } from "lucide-react";
import {
  applySupplierGlobalMargin,
  listAdminSupplierCatalogProducts,
  saveAdminSupplierWholesalePrices,
  setAdminSupplierProductVisibility,
  setAdminSupplierSuggestedRetailPrice,
  setAdminSupplierWholesalePrice,
  setSupplierCatalogPublication,
  setSupplierPublicCatalogEnabled,
  type AdminSupplierCatalogProduct,
  type AdminSupplierMarginOption,
} from "@/lib/admin/supplier-catalog-actions";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { supplierCategoryLabel } from "@/lib/supplier/categories";
import {
  formatSupplierAmountInput,
  mayoristaFromMarginPercent,
  marginPercentFromPrices,
  parsePercentAmount,
  parseUsdAmount,
} from "@/lib/supplier/wholesale-price";
import { formatUsd } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type PriceDraft = {
  mayorista: string;
  marginPercent: string;
  suggestedRetail: string;
};

function draftsFromProduct(product: AdminSupplierCatalogProduct): PriceDraft {
  const mayorista = product.precioMayoristaUsd;
  return {
    mayorista: formatSupplierAmountInput(mayorista),
    marginPercent:
      mayorista == null
        ? ""
        : formatSupplierAmountInput(
            marginPercentFromPrices(product.costoProveedorUsd, mayorista),
          ),
    suggestedRetail: formatSupplierAmountInput(product.suggestedRetailUsd),
  };
}

function isPriceDirty(product: AdminSupplierCatalogProduct, draft: PriceDraft): boolean {
  return parseUsdAmount(draft.mayorista) !== product.precioMayoristaUsd;
}

function isSuggestedRetailDirty(
  product: AdminSupplierCatalogProduct,
  draft: PriceDraft,
): boolean {
  return parseUsdAmount(draft.suggestedRetail) !== product.suggestedRetailUsd;
}

function effectiveWholesaleUsd(
  product: AdminSupplierCatalogProduct,
  draft: PriceDraft,
  dirty: boolean,
): number | null {
  if (dirty) {
    return parseUsdAmount(draft.mayorista);
  }
  return product.precioMayoristaUsd;
}

function effectiveSuggestedRetailUsd(
  product: AdminSupplierCatalogProduct,
  draft: PriceDraft,
  suggestedDirty: boolean,
): number | null {
  if (suggestedDirty) {
    return parseUsdAmount(draft.suggestedRetail);
  }
  return product.suggestedRetailUsd;
}

function canEnableDropshipperVisibility(
  product: AdminSupplierCatalogProduct,
  draft: PriceDraft,
  priceDirty: boolean,
  suggestedDirty: boolean,
): boolean {
  const mayorista = effectiveWholesaleUsd(product, draft, priceDirty);
  const suggested = effectiveSuggestedRetailUsd(
    product,
    draft,
    suggestedDirty,
  );
  return mayorista != null && mayorista > 0 && suggested != null && suggested > 0;
}

function MoneyInput({
  prefix,
  suffix,
  value,
  disabled,
  onChange,
  onBlur,
  className,
}: {
  prefix?: string;
  suffix?: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("relative w-[6.5rem] shrink-0", className)}>
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
        onBlur={onBlur}
        className={cn("h-9 text-sm", prefix && "pl-6", suffix && "pr-7")}
        placeholder="—"
      />
    </div>
  );
}

export function AdminSupplierCatalogPanel() {
  const [products, setProducts] = useState<AdminSupplierCatalogProduct[]>([]);
  const [suppliers, setSuppliers] = useState<AdminSupplierMarginOption[]>([]);
  const [query, setQuery] = useState("");
  const [priceDrafts, setPriceDrafts] = useState<Record<string, PriceDraft>>({});
  const [headerPercent, setHeaderPercent] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Record<string, true>>({});
  const [busySupplierId, setBusySupplierId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const productsRef = useRef(products);
  const draftsRef = useRef(priceDrafts);
  const saveTimers = useRef<Record<string, number>>({});

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    draftsRef.current = priceDrafts;
  }, [priceDrafts]);

  function hydrate(
    rows: AdminSupplierCatalogProduct[],
    options: AdminSupplierMarginOption[],
  ) {
    const drafts = Object.fromEntries(
      rows.map((row) => [row.id, draftsFromProduct(row)]),
    );
    productsRef.current = rows;
    draftsRef.current = drafts;
    setProducts(rows);
    setSuppliers(options);
    setPriceDrafts(drafts);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const result = await listAdminSupplierCatalogProducts();
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      hydrate(result.products ?? [], result.suppliers ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (product) =>
        product.title.toLowerCase().includes(q) ||
        product.supplierName.toLowerCase().includes(q) ||
        supplierCategoryLabel(product.category).toLowerCase().includes(q),
    );
  }, [products, query]);

  const groups = useMemo(() => {
    return suppliers
      .map((supplier) => {
        const rows = filtered.filter(
          (product) => product.supplierUserId === supplier.id,
        );
        const listedCount = rows.filter((product) => product.isVisible).length;
        const catalogOn = supplier.catalogVisible;
        return {
          supplier,
          rows,
          listedCount,
          catalogOn,
        };
      })
      .filter((group) => group.rows.length > 0);
  }, [filtered, suppliers]);

  const dirtyProducts = useMemo(
    () =>
      products.filter((product) =>
        isPriceDirty(
          product,
          priceDrafts[product.id] ?? draftsFromProduct(product),
        ),
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

  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      for (const timer of Object.values(timers)) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  function replaceProduct(next: AdminSupplierCatalogProduct) {
    setProducts((current) => {
      const rows = current.map((item) => (item.id === next.id ? next : item));
      productsRef.current = rows;
      return rows;
    });
    setPriceDrafts((current) => {
      const drafts = {
        ...current,
        [next.id]: draftsFromProduct(next),
      };
      draftsRef.current = drafts;
      return drafts;
    });
  }

  function patchDraft(product: AdminSupplierCatalogProduct, patch: Partial<PriceDraft>) {
    setPriceDrafts((current) => {
      const drafts = {
        ...current,
        [product.id]: {
          ...(current[product.id] ?? draftsFromProduct(product)),
          ...patch,
        },
      };
      draftsRef.current = drafts;
      return drafts;
    });
  }

  async function persistPrice(productId: string) {
    const product = productsRef.current.find((item) => item.id === productId);
    const draft = draftsRef.current[productId];
    if (!product || !draft || !isPriceDirty(product, draft)) return;
    if (parseUsdAmount(draft.mayorista) == null) return;

    setSavingIds((current) => ({ ...current, [productId]: true }));
    setError(null);
    try {
      const result = await setAdminSupplierWholesalePrice({
        productId,
        precioMayoristaUsd: draft.mayorista,
      });
      if (result.error || !result.product) {
        setError(result.error ?? "No se pudo guardar el precio mayorista.");
        return;
      }
      const latest = draftsRef.current[productId];
      const latestParsed = latest ? parseUsdAmount(latest.mayorista) : null;
      if (latestParsed != null && latestParsed !== parseUsdAmount(draft.mayorista)) {
        setProducts((current) =>
          current.map((item) =>
            item.id === result.product!.id ? result.product! : item,
          ),
        );
        return;
      }
      replaceProduct(result.product);
      setMessage(null);
    } finally {
      setSavingIds((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
    }
  }

  function queueAutosave(productId: string) {
    window.clearTimeout(saveTimers.current[productId]);
    saveTimers.current[productId] = window.setTimeout(() => {
      void persistPrice(productId);
    }, 650);
  }

  async function persistSuggestedRetail(productId: string) {
    const product = productsRef.current.find((item) => item.id === productId);
    const draft = draftsRef.current[productId];
    if (!product || !draft || !isSuggestedRetailDirty(product, draft)) return;

    const trimmed = draft.suggestedRetail.trim();
    const parsed =
      trimmed === "" ? null : parseUsdAmount(trimmed, { min: 0 });
    if (trimmed !== "" && (parsed == null || parsed <= 0)) {
      patchDraft(product, {
        suggestedRetail: formatSupplierAmountInput(product.suggestedRetailUsd),
      });
      return;
    }

    setSavingIds((current) => ({ ...current, [productId]: true }));
    try {
      const result = await setAdminSupplierSuggestedRetailPrice({
        productId,
        suggestedRetailUsd: trimmed || null,
      });
      if (result.error || !result.product) {
        patchDraft(product, {
          suggestedRetail: formatSupplierAmountInput(product.suggestedRetailUsd),
        });
        return;
      }
      const latest = draftsRef.current[productId];
      const latestParsed = latest
        ? parseUsdAmount(latest.suggestedRetail)
        : null;
      const savedParsed = parsed;
      if (latestParsed !== savedParsed) {
        setProducts((current) =>
          current.map((item) =>
            item.id === result.product!.id ? result.product! : item,
          ),
        );
        return;
      }
      replaceProduct(result.product);
      setMessage(null);
    } finally {
      setSavingIds((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
    }
  }

  function onSuggestedRetailChange(
    product: AdminSupplierCatalogProduct,
    raw: string,
  ) {
    patchDraft(product, { suggestedRetail: raw });
  }

  function onMayoristaChange(product: AdminSupplierCatalogProduct, raw: string) {
    const parsed = parseUsdAmount(raw);
    const percent =
      parsed == null
        ? ""
        : formatSupplierAmountInput(
            marginPercentFromPrices(product.costoProveedorUsd, parsed),
          );
    patchDraft(product, { mayorista: raw, marginPercent: percent });
    queueAutosave(product.id);
  }

  function onMarginPercentChange(product: AdminSupplierCatalogProduct, raw: string) {
    const parsed = parsePercentAmount(raw);
    const mayorista =
      parsed == null
        ? ""
        : formatSupplierAmountInput(
            mayoristaFromMarginPercent(product.costoProveedorUsd, parsed),
          );
    patchDraft(product, { marginPercent: raw, mayorista });
    queueAutosave(product.id);
  }

  async function handleProductVisibility(
    product: AdminSupplierCatalogProduct,
    visible: boolean,
  ) {
    const draft = priceDrafts[product.id] ?? draftsFromProduct(product);
    const priceDirty = isPriceDirty(product, draft);
    const suggestedDirty = isSuggestedRetailDirty(product, draft);
    if (
      visible &&
      !canEnableDropshipperVisibility(product, draft, priceDirty, suggestedDirty)
    ) {
      return;
    }

    setSavingIds((current) => ({ ...current, [product.id]: true }));
    setError(null);
    setMessage(null);
    try {
      const result = await setAdminSupplierProductVisibility({
        productId: product.id,
        visible,
      });
      if (result.error || !result.product) {
        setError(result.error ?? "No se pudo actualizar la visibilidad.");
        return;
      }
      replaceProduct(result.product);
      setMessage(
        visible
          ? `“${result.product.title}” visible para dropshippers.`
          : `“${result.product.title}” oculto para dropshippers.`,
      );
    } finally {
      setSavingIds((current) => {
        const next = { ...current };
        delete next[product.id];
        return next;
      });
    }
  }

  async function handleSaveAll() {
    const items = dirtyProducts
      .map((product) => ({
        productId: product.id,
        precioMayoristaUsd: priceDrafts[product.id]?.mayorista ?? "",
      }))
      .filter((item) => parseUsdAmount(item.precioMayoristaUsd) != null);
    if (items.length === 0) return;

    for (const item of items) {
      window.clearTimeout(saveTimers.current[item.productId]);
    }
    setSavingAll(true);
    setError(null);
    setMessage(null);
    try {
      const result = await saveAdminSupplierWholesalePrices(items);
      if (result.products) {
        const byId = new Map(result.products.map((item) => [item.id, item]));
        setProducts((current) =>
          current.map((item) => byId.get(item.id) ?? item),
        );
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
      setMessage(`${result.saved ?? 0} precio(s) guardado(s).`);
    } finally {
      setSavingAll(false);
    }
  }

  async function handleCatalogToggle(supplierId: string, published: boolean) {
    const pending = dirtyProducts.filter(
      (product) => product.supplierUserId === supplierId,
    );
    setBusySupplierId(supplierId);
    setError(null);
    setMessage(null);
    try {
      if (pending.length > 0) {
        const saved = await saveAdminSupplierWholesalePrices(
          pending.map((product) => ({
            productId: product.id,
            precioMayoristaUsd: priceDrafts[product.id]?.mayorista ?? "",
          })),
        );
        if (saved.error) {
          setError(saved.error);
          return;
        }
        if (saved.products) {
          const byId = new Map(saved.products.map((item) => [item.id, item]));
          setProducts((current) =>
            current.map((item) => byId.get(item.id) ?? item),
          );
        }
      }

      const result = await setSupplierCatalogPublication({
        supplierUserId: supplierId,
        published,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.products && result.suppliers) {
        hydrate(result.products, result.suppliers);
      }
      const skipped =
        result.skippedWithoutPrice && result.skippedWithoutPrice > 0
          ? ` ${result.skippedWithoutPrice} sin precio siguen en borrador.`
          : "";
      setMessage(
        published
          ? `Catálogo publicado: ${result.updated ?? 0} producto(s) visibles para dropshippers.${skipped}`
          : `Catálogo desactivado: ${result.updated ?? 0} producto(s) en borrador.`,
      );
    } finally {
      setBusySupplierId(null);
    }
  }

  async function handlePublicCatalogToggle(supplierId: string, enabled: boolean) {
    setBusySupplierId(supplierId);
    setError(null);
    setMessage(null);
    try {
      const result = await setSupplierPublicCatalogEnabled({
        supplierUserId: supplierId,
        enabled,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.products && result.suppliers) {
        hydrate(result.products, result.suppliers);
      } else {
        setSuppliers((current) =>
          current.map((supplier) =>
            supplier.id === supplierId
              ? {
                  ...supplier,
                  showPublicCatalog: result.showPublicCatalog === true,
                  publicCatalogSlug: result.publicCatalogSlug ?? null,
                }
              : supplier,
          ),
        );
      }
      setMessage(
        enabled
          ? result.publicCatalogPath
            ? `Vitrina pública habilitada: ${result.publicCatalogPath}`
            : "Vitrina pública habilitada."
          : "Vitrina pública deshabilitada.",
      );
    } finally {
      setBusySupplierId(null);
    }
  }

  async function handleApplyPercent(supplierId: string) {
    const percent = parsePercentAmount(headerPercent[supplierId], {
      min: 0,
      max: 1000,
    });
    if (percent == null) {
      setError("Indica un porcentaje de ganancia válido.");
      return;
    }
    setBusySupplierId(supplierId);
    setError(null);
    setMessage(null);
    try {
      const result = await applySupplierGlobalMargin({
        supplierUserId: supplierId,
        marginPercent: percent,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.products && result.suppliers) {
        hydrate(result.products, result.suppliers);
      }
      setMessage(
        `Margen de ${percent}% aplicado a ${result.updated ?? 0} producto(s) (mayorista y venta sugerido).`,
      );
    } finally {
      setBusySupplierId(null);
    }
  }

  const busy = savingAll || busySupplierId != null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="admin-stores-search max-w-md flex-1">
          <Search className="admin-stores-search-icon" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar producto o proveedor"
            className="admin-stores-search-input"
          />
        </div>
        {dirtyProducts.length > 0 ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => void handleSaveAll()}
          >
            {savingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            Guardar cambios ({dirtyProducts.length})
          </Button>
        ) : null}
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
          Cargando productos…
        </p>
      ) : products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          Cuando un proveedor suba un producto, aparece aquí con su costo.
        </p>
      ) : groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          No hay coincidencias.
        </p>
      ) : (
        groups.map(({ supplier, rows, listedCount, catalogOn }) => {
          const supplierBusy = busySupplierId === supplier.id;
          return (
            <section
              key={supplier.id}
              className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            >
              <header className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {supplier.name}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {rows.length} producto{rows.length === 1 ? "" : "s"}
                    {listedCount > 0
                      ? ` · ${listedCount} visibles`
                      : " · todos ocultos"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <MoneyInput
                      suffix="%"
                      value={
                        headerPercent[supplier.id] ??
                        (supplier.globalMarginPercent != null
                          ? String(supplier.globalMarginPercent)
                          : "")
                      }
                      disabled={supplierBusy || busy}
                      onChange={(value) =>
                        setHeaderPercent((current) => ({
                          ...current,
                          [supplier.id]: value,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={supplierBusy || busy}
                      onClick={() => void handleApplyPercent(supplier.id)}
                    >
                      Aplicar %
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 border-l border-zinc-200 pl-3 dark:border-zinc-800">
                    <div className="text-right">
                      <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        {catalogOn ? "Catálogo publicado" : "Catálogo oculto"}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {catalogOn
                          ? "Visible para dropshippers"
                          : "Publicar o desactivar todo"}
                      </p>
                    </div>
                    <SettingsSwitch
                      id={`supplier-catalog-${supplier.id}`}
                      checked={catalogOn}
                      disabled={supplierBusy || busy}
                      label={
                        catalogOn
                          ? `Desactivar catálogo de ${supplier.name}`
                          : `Publicar catálogo de ${supplier.name}`
                      }
                      onChange={(checked) =>
                        void handleCatalogToggle(supplier.id, checked)
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 border-l border-zinc-200 pl-3 dark:border-zinc-800">
                    <div className="text-right">
                      <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        Vitrina pública habilitada
                      </p>
                      {supplier.showPublicCatalog && supplier.publicCatalogSlug ? (
                        <a
                          href={`/vitrina/${supplier.publicCatalogSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          Abrir enlace
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      ) : (
                        <p className="text-[11px] text-zinc-500">
                          Accesible por su enlace
                        </p>
                      )}
                    </div>
                    <SettingsSwitch
                      id={`supplier-public-catalog-${supplier.id}`}
                      checked={supplier.showPublicCatalog === true}
                      disabled={supplierBusy || busy}
                      label={`Vitrina pública habilitada de ${supplier.name}`}
                      onChange={(checked) =>
                        void handlePublicCatalogToggle(supplier.id, checked)
                      }
                    />
                  </div>
                </div>
              </header>

              <div className="admin-stores-table-shell">
                <div className="admin-stores-table-scroll">
                <table className="admin-stores-table min-w-[72rem]">
                  <thead>
                    <tr>
                      <th className="admin-stores-th min-w-[12rem]">Producto</th>
                      <th className="admin-stores-th w-16 text-center">Stock</th>
                      <th className="admin-stores-th w-24 whitespace-normal leading-tight">
                        Costo
                      </th>
                      <th className="admin-stores-th min-w-[8.5rem] whitespace-normal leading-tight">
                        Precio
                        <span className="block font-normal normal-case tracking-normal text-zinc-400">
                          mayorista
                        </span>
                      </th>
                      <th className="admin-stores-th w-24 whitespace-normal leading-tight">
                        Ganancia
                        <span className="block font-normal normal-case tracking-normal text-zinc-400">
                          %
                        </span>
                      </th>
                      <th
                        className="admin-stores-th min-w-[8.5rem] whitespace-normal leading-tight"
                        title="Precio de venta sugerido para dropshippers al cargar todo el catálogo"
                      >
                        P. venta
                        <span className="block font-normal normal-case tracking-normal text-zinc-400">
                          sugerido
                        </span>
                      </th>
                      <th className="admin-stores-th w-28 whitespace-normal leading-tight">
                        Visible
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((product) => {
                      const draft =
                        priceDrafts[product.id] ?? draftsFromProduct(product);
                      const dirty = isPriceDirty(product, draft);
                      const suggestedDirty = isSuggestedRetailDirty(product, draft);
                      const saving = Boolean(savingIds[product.id]);
                      const canEnableVisibility = canEnableDropshipperVisibility(
                        product,
                        draft,
                        dirty,
                        suggestedDirty,
                      );
                      const visibilityDisabled =
                        !product.isVisible && !canEnableVisibility;
                      return (
                        <tr
                          key={product.id}
                          className={cn(
                            "border-b border-zinc-100 last:border-b-0 dark:border-zinc-800",
                            !product.isVisible && "opacity-70",
                          )}
                        >
                          <td className="admin-stores-td !max-w-none min-w-[12rem]">
                            <div className="flex min-w-[11rem] items-center gap-3">
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-900">
                                {product.imageUrl ? (
                                  <Image
                                    src={product.imageUrl}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                  />
                                ) : null}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                                  {product.title}
                                </p>
                                <p className="text-[11px] text-zinc-500">
                                  {supplierCategoryLabel(product.category)}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="admin-stores-td !max-w-none w-16 text-center">
                            <span
                              className={cn(
                                "tabular-nums text-sm font-medium",
                                product.stock <= 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-zinc-900 dark:text-zinc-50",
                              )}
                            >
                              {product.stock}
                            </span>
                          </td>
                          <td className="admin-stores-td !max-w-none w-24 font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                            {formatUsd(product.costoProveedorUsd)}
                          </td>
                          <td className="admin-stores-td !max-w-none min-w-[8.5rem]">
                            <div className="flex items-center gap-1.5">
                              <MoneyInput
                                prefix="$"
                                value={draft.mayorista}
                                disabled={saving || busy}
                                onChange={(value) =>
                                  onMayoristaChange(product, value)
                                }
                                onBlur={() => void persistPrice(product.id)}
                              />
                              {saving ? (
                                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zinc-400" />
                              ) : dirty ? (
                                <span className="text-[11px] text-amber-600">
                                  …
                                </span>
                              ) : draft.mayorista ? (
                                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              ) : null}
                            </div>
                          </td>
                          <td className="admin-stores-td !max-w-none w-24">
                            <MoneyInput
                              suffix="%"
                              value={draft.marginPercent}
                              disabled={
                                saving || busy || product.costoProveedorUsd <= 0
                              }
                              onChange={(value) =>
                                onMarginPercentChange(product, value)
                              }
                              onBlur={() => void persistPrice(product.id)}
                            />
                          </td>
                          <td className="admin-stores-td !max-w-none min-w-[8.5rem]">
                            <MoneyInput
                              prefix="$"
                              value={draft.suggestedRetail}
                              disabled={saving || busy}
                              onChange={(value) =>
                                onSuggestedRetailChange(product, value)
                              }
                              onBlur={() => void persistSuggestedRetail(product.id)}
                            />
                          </td>
                          <td className="admin-stores-td !max-w-none w-28">
                            <span
                              title={
                                visibilityDisabled
                                  ? "Completa precio mayorista y venta sugerido para activar"
                                  : undefined
                              }
                            >
                              <SettingsSwitch
                                id={`product-visible-${product.id}`}
                                size="sm"
                                checked={product.isVisible}
                                disabled={saving || busy || visibilityDisabled}
                                label={
                                  product.isVisible
                                    ? `Ocultar ${product.title}`
                                    : `Mostrar ${product.title}`
                                }
                                onChange={(checked) =>
                                  void handleProductVisibility(product, checked)
                                }
                              />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
