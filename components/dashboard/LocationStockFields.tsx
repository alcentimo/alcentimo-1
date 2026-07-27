"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listStoreLocationsAction } from "@/lib/locations/actions";
import type { StoreLocation } from "@/lib/locations/types";

interface LocationStockFieldsProps {
  /** Stock inicial al editar; omitir en alta para no prellenar con 0. */
  defaultStock?: number;
  /** Stocks previos por sede al editar. */
  initialByLocation?: Record<string, number>;
  /** Si hay variantes custom, ocultamos el editor de stock simple. */
  hidden?: boolean;
  inputId?: string;
}

export function LocationStockFields({
  defaultStock,
  initialByLocation = {},
  hidden = false,
  inputId = "product-stock",
}: LocationStockFieldsProps) {
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [stocks, setStocks] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listStoreLocationsAction();
      if (cancelled) return;
      const rows = (result.locations ?? []).filter((loc) => loc.is_active);
      setLocations(rows);
      const next: Record<string, string> = {};
      for (const loc of rows) {
        const fromInitial = initialByLocation[loc.id];
        if (fromInitial != null) {
          next[loc.id] = String(fromInitial);
        } else if (
          defaultStock != null &&
          (rows.length === 1 || loc.is_default)
        ) {
          next[loc.id] = String(defaultStock);
        } else {
          next[loc.id] = "";
        }
      }
      setStocks(next);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // Solo al montar: valores iniciales vienen del servidor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payload = useMemo(
    () =>
      JSON.stringify(
        locations.map((loc) => ({
          locationId: loc.id,
          stockQuantity: Math.max(0, Math.floor(Number(stocks[loc.id]) || 0)),
        })),
      ),
    [locations, stocks],
  );

  const totalStock = useMemo(
    () =>
      locations.reduce(
        (sum, loc) => sum + Math.max(0, Math.floor(Number(stocks[loc.id]) || 0)),
        0,
      ),
    [locations, stocks],
  );

  const allStockInputsEmpty = useMemo(
    () =>
      locations.length > 0 &&
      locations.every((loc) => !(stocks[loc.id] ?? "").trim()),
    [locations, stocks],
  );

  if (hidden) {
    return (
      <>
        <input type="hidden" name="stock_quantity" value="0" readOnly />
        <input type="hidden" name="location_stocks_json" value="[]" readOnly />
      </>
    );
  }

  if (!loaded) {
    return (
      <div>
        <Label className="payment-field-label">
          Cantidad en stock <span className="text-red-500">*</span>
        </Label>
        <Input
          id={inputId}
          type="number"
          name="stock_quantity"
          required
          min={0}
          step={1}
          defaultValue={defaultStock != null ? defaultStock : undefined}
          placeholder="Ej: 10"
          className="payment-field-input mt-1.5"
        />
      </div>
    );
  }

  if (locations.length <= 1) {
    const locationId = locations[0]?.id;
    return (
      <div>
        <Label htmlFor={inputId} className="payment-field-label">
          Cantidad en stock <span className="text-red-500">*</span>
        </Label>
        <Input
          id={inputId}
          name="stock_quantity"
          type="number"
          required
          min={0}
          step={1}
          placeholder="Ej: 10"
          value={
            locationId
              ? (stocks[locationId] ?? "")
              : defaultStock != null
                ? String(defaultStock)
                : ""
          }
          onChange={(e) => {
            if (!locationId) return;
            setStocks((prev) => ({ ...prev, [locationId]: e.target.value }));
          }}
          className="payment-field-input mt-1.5"
        />
        <input type="hidden" name="location_stocks_json" value={payload} readOnly />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="payment-field-label">
          Stock por sucursal <span className="text-red-500">*</span>
        </Label>
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          Cada sede tiene su propio inventario. Total: {totalStock} unidades.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2 font-medium">Sucursal</th>
              <th className="px-3 py-2 font-medium">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => (
              <tr
                key={loc.id}
                className="border-t border-zinc-100 dark:border-zinc-800"
              >
                <td className="px-3 py-2">
                  <span className="font-medium text-zinc-800 dark:text-zinc-100">
                    {loc.name}
                  </span>
                  {loc.is_default ? (
                    <span className="ml-2 text-[10px] text-teal-700 dark:text-teal-400">
                      Principal
                    </span>
                  ) : null}
                  {loc.city ? (
                    <p className="text-[11px] text-zinc-500">{loc.city}</p>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    required
                    placeholder="0"
                    value={stocks[loc.id] ?? ""}
                    onChange={(e) =>
                      setStocks((prev) => ({
                        ...prev,
                        [loc.id]: e.target.value,
                      }))
                    }
                    className="payment-field-input w-28"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <input
        type="hidden"
        name="stock_quantity"
        value={allStockInputsEmpty ? "" : String(totalStock)}
        readOnly
      />
      <input type="hidden" name="location_stocks_json" value={payload} readOnly />
    </div>
  );
}
