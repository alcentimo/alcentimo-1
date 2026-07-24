"use client";

import { useMemo, useState } from "react";
import { Check, MapPin, Search } from "lucide-react";
import type { ShippingCarrierKey } from "@/lib/store-settings/types";
import {
  formatCarrierBranchAddress,
  formatCarrierBranchLabel,
  getCarrierBranchById,
  searchCarrierBranches,
  type CarrierBranch,
} from "@/lib/shipping/carrier-branches";
import { getShippingMethod } from "@/src/config/shipping-methods";
import { cn } from "@/lib/cn";

interface ShippingBranchPickerProps {
  carrier: ShippingCarrierKey;
  value: string | null;
  onChange: (branch: CarrierBranch | null) => void;
}

export function ShippingBranchPicker({
  carrier,
  value,
  onChange,
}: ShippingBranchPickerProps) {
  const [query, setQuery] = useState("");
  const selectedBranch = useMemo(
    () => getCarrierBranchById(value),
    [value],
  );
  const carrierLabel = getShippingMethod(carrier).label;

  const results = useMemo(
    () => searchCarrierBranches(carrier, query),
    [carrier, query],
  );

  return (
    <div className="shipping-branch-picker">
      <div className="shipping-branch-picker-header">
        <p className="shipping-branch-picker-title">
          Sucursal de destino · {carrierLabel}
        </p>
        <p className="shipping-branch-picker-desc">
          Elige la oficina donde retirarás tu paquete.
        </p>
      </div>

      {selectedBranch ? (
        <div className="shipping-branch-selected">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {formatCarrierBranchLabel(selectedBranch)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {formatCarrierBranchAddress(selectedBranch)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shipping-branch-change-btn"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <label className="shipping-branch-search">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por ciudad, zona u oficina…"
              className="shipping-branch-search-input"
              autoComplete="off"
            />
          </label>

          <ul className="shipping-branch-list" role="listbox" aria-label="Sucursales disponibles">
            {results.length === 0 ? (
              <li className="shipping-branch-empty">
                No encontramos sucursales con ese criterio.
              </li>
            ) : (
              results.map((branch) => {
                const isSelected = value === branch.id;
                return (
                  <li key={branch.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => onChange(branch)}
                      className={cn(
                        "shipping-branch-option",
                        isSelected && "shipping-branch-option-selected",
                      )}
                    >
                      <MapPin
                        className="mt-0.5 h-4 w-4 shrink-0 text-teal-600"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {formatCarrierBranchLabel(branch)}
                        </span>
                        <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                          {branch.address}
                        </span>
                      </span>
                      {isSelected ? (
                        <Check className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </>
      )}
    </div>
  );
}
