"use client";

import { MapPin, Truck } from "lucide-react";
import { useCatalogFulfillment } from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import { cn } from "@/lib/cn";

/** Solo visible cuando la tienda tiene más de una sucursal activa. */
export function CatalogLocationPicker() {
  const {
    multiLocation,
    locations,
    mode,
    setMode,
    selectedLocationId,
    setSelectedLocationId,
    selectedLocation,
  } = useCatalogFulfillment();

  if (!multiLocation) return null;

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white/90 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
        ¿Cómo quieres recibir tu pedido?
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("delivery")}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition",
            mode === "delivery"
              ? "border-teal-500 bg-teal-50 text-teal-900 dark:border-teal-600 dark:bg-teal-950/40 dark:text-teal-100"
              : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900",
          )}
        >
          <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Envío a domicilio
        </button>
        <button
          type="button"
          onClick={() => setMode("pickup")}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition",
            mode === "pickup"
              ? "border-teal-500 bg-teal-50 text-teal-900 dark:border-teal-600 dark:bg-teal-950/40 dark:text-teal-100"
              : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900",
          )}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Retiro en tienda
        </button>
      </div>

      {mode === "pickup" ? (
        <div className="mt-3">
          <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            Sucursal de retiro
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            value={selectedLocationId ?? ""}
            onChange={(e) => setSelectedLocationId(e.target.value || null)}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
                {loc.city ? ` — ${loc.city}` : ""}
              </option>
            ))}
          </select>
          {selectedLocation?.address ? (
            <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              {selectedLocation.address}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          La disponibilidad muestra el stock total de todas las sedes.
        </p>
      )}
    </div>
  );
}
