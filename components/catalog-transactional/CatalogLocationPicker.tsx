"use client";

import { ChevronDown, MapPin, Truck } from "lucide-react";
import { useCatalogFulfillment } from "@/components/catalog-transactional/CatalogFulfillmentProvider";
import { cn } from "@/lib/cn";

interface CatalogLocationPickerProps {
  /**
   * Envío/Retiro: solo en carrito/checkout.
   * En la cabecera del catálogo solo se elige sucursal.
   */
  showFulfillmentModes?: boolean;
}

/** Barra de sucursal (y opcionalmente modalidad de entrega). */
export function CatalogLocationPicker({
  showFulfillmentModes = false,
}: CatalogLocationPickerProps) {
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
    <div
      className="catalog-fulfillment-bar"
      aria-label={
        showFulfillmentModes ? "Sede y entrega" : "Sucursal"
      }
    >
      <div className="catalog-fulfillment-bar-location">
        <MapPin
          className="catalog-fulfillment-bar-icon"
          aria-hidden="true"
        />
        <label className="sr-only" htmlFor="catalog-fulfillment-location">
          Sucursal
        </label>
        <div className="catalog-fulfillment-select-wrap">
          <select
            id="catalog-fulfillment-location"
            className="catalog-fulfillment-select"
            value={selectedLocationId ?? ""}
            onChange={(e) => setSelectedLocationId(e.target.value || null)}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
                {loc.city ? ` · ${loc.city}` : ""}
              </option>
            ))}
          </select>
          <ChevronDown
            className="catalog-fulfillment-select-chevron"
            aria-hidden="true"
          />
        </div>
      </div>

      {showFulfillmentModes ? (
        <div
          className="catalog-fulfillment-modes"
          role="group"
          aria-label="Forma de entrega"
        >
          <button
            type="button"
            onClick={() => setMode("delivery")}
            aria-pressed={mode === "delivery"}
            className={cn(
              "catalog-fulfillment-mode-btn",
              mode === "delivery" && "catalog-fulfillment-mode-btn-active",
            )}
          >
            <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Envío
          </button>
          <button
            type="button"
            onClick={() => setMode("pickup")}
            aria-pressed={mode === "pickup"}
            className={cn(
              "catalog-fulfillment-mode-btn",
              mode === "pickup" && "catalog-fulfillment-mode-btn-active",
            )}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Retiro
          </button>
        </div>
      ) : null}

      {selectedLocation?.address ? (
        <p className="catalog-fulfillment-bar-hint sm:sr-only">
          {selectedLocation.address}
        </p>
      ) : null}
    </div>
  );
}
