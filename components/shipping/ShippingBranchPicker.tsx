"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, MapPin, Search } from "lucide-react";
import type { ShippingCarrierKey } from "@/lib/store-settings/types";
import {
  formatCarrierBranchAddress,
  formatCarrierBranchLabel,
  getCarrierBranchById,
  getCarrierBranchesByLocation,
  getCarrierCities,
  getCarrierStates,
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
  const selectedBranch = useMemo(
    () => getCarrierBranchById(value),
    [value],
  );
  const carrierLabel = getShippingMethod(carrier)?.label ?? carrier;
  const states = useMemo(() => getCarrierStates(carrier), [carrier]);

  const [state, setState] = useState(selectedBranch?.state ?? "");
  const [city, setCity] = useState(selectedBranch?.city ?? "");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (selectedBranch) {
      setState(selectedBranch.state);
      setCity(selectedBranch.city);
      return;
    }
    setState("");
    setCity("");
    setQuery("");
  }, [carrier, selectedBranch]);

  const cities = useMemo(
    () => (state ? getCarrierCities(carrier, state) : []),
    [carrier, state],
  );

  const results = useMemo(() => {
    if (!state || !city) return [];
    if (query.trim()) {
      return searchCarrierBranches(carrier, query, 80, { state, city });
    }
    return getCarrierBranchesByLocation(carrier, state, city);
  }, [carrier, state, city, query]);

  if (selectedBranch) {
    return (
      <div className="shipping-branch-picker">
        <div className="shipping-branch-picker-header">
          <p className="shipping-branch-picker-eyebrow">Oficina de retiro</p>
          <p className="shipping-branch-picker-title">
            Sucursal {carrierLabel}
          </p>
          <p className="shipping-branch-picker-desc">
            Elige estado y ciudad para ver todas las agencias de esa zona.
          </p>
        </div>

        <div className="shipping-branch-selected">
          <MapPin
            className="mt-0.5 h-4 w-4 shrink-0 text-teal-600"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {formatCarrierBranchLabel(selectedBranch)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
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
      </div>
    );
  }

  return (
    <div className="shipping-branch-picker">
      <div className="shipping-branch-picker-header">
        <p className="shipping-branch-picker-eyebrow">Oficina de retiro</p>
        <p className="shipping-branch-picker-title">Sucursal {carrierLabel}</p>
        <p className="shipping-branch-picker-desc">
          Filtra por estado y ciudad/municipio para ver todas las agencias
          disponibles en esa zona.
        </p>
      </div>

      <div className="shipping-branch-browse">
        <div className="shipping-branch-filters">
          <label className="shipping-branch-filter">
            <span className="shipping-branch-sublabel">Estado</span>
            <select
              value={state}
              onChange={(event) => {
                setState(event.target.value);
                setCity("");
                setQuery("");
              }}
              className="shipping-branch-select"
            >
              <option value="">Selecciona un estado</option>
              {states.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="shipping-branch-filter">
            <span className="shipping-branch-sublabel">Ciudad / municipio</span>
            <select
              value={city}
              disabled={!state}
              onChange={(event) => {
                setCity(event.target.value);
                setQuery("");
              }}
              className="shipping-branch-select"
            >
              <option value="">
                {state ? "Selecciona una ciudad" : "Primero elige el estado"}
              </option>
              {cities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {state && city ? (
          <>
            <label className="shipping-branch-search">
              <Search
                className="h-4 w-4 shrink-0 text-zinc-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filtrar por nombre, zona o código…"
                className="shipping-branch-search-input"
                autoComplete="off"
              />
            </label>

            <p className="shipping-branch-count">
              {results.length}{" "}
              {results.length === 1 ? "agencia" : "agencias"} en {city}, {state}
            </p>

            <ul
              className="shipping-branch-list"
              role="listbox"
              aria-label={`Sucursales en ${city}`}
            >
              {results.length === 0 ? (
                <li className="shipping-branch-empty">
                  No hay agencias con ese filtro en esta zona.
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
                          className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {branch.name}
                            {branch.code ? (
                              <span className="ml-1.5 font-normal text-zinc-400">
                                · {branch.code}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {branch.address}
                          </span>
                        </span>
                        {isSelected ? (
                          <Check
                            className="h-4 w-4 shrink-0 text-teal-600"
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </>
        ) : (
          <p className="shipping-branch-empty rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
            Selecciona estado y ciudad para listar las oficinas disponibles.
          </p>
        )}
      </div>
    </div>
  );
}
