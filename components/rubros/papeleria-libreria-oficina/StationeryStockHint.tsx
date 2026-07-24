"use client";

import {
  formatStationeryStockSummary,
  getStationeryUnitsPerPackFromFields,
} from "@/lib/rubros/modules/papeleria-libreria-oficina";
import type { ProductExtraFieldsMap } from "@/lib/products/extra-fields";

interface StationeryStockHintProps {
  extraFields: ProductExtraFieldsMap;
  stockQuantity: number;
}

export function StationeryStockHint({
  extraFields,
  stockQuantity,
}: StationeryStockHintProps) {
  const unitsPerPack = getStationeryUnitsPerPackFromFields(extraFields);
  if (!unitsPerPack) return null;

  const summary = formatStationeryStockSummary({
    baseStock: stockQuantity,
    presentation: extraFields["Presentación"],
    unitsPerPack,
  });

  return (
    <div className="rounded-lg border border-slate-200/90 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300">
      <p className="font-medium text-slate-800 dark:text-slate-100">
        Inventario en unidades sueltas
      </p>
      <p className="mt-1">
        Registra el total de piezas disponibles. Cada{" "}
        {extraFields["Presentación"]?.toLowerCase() ?? "empaque"} equivale a{" "}
        {unitsPerPack} unidades para venta por bulto o suelta.
      </p>
      {summary ? <p className="mt-1.5 text-slate-500 dark:text-slate-400">{summary}</p> : null}
    </div>
  );
}
