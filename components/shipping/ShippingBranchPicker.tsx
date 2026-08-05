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

function BranchOption({
  branch,
  selected,
  onSelect,
}: {
  branch: CarrierBranch;
  selected: boolean;
  onSelect: (branch: CarrierBranch) => void;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={() => onSelect(branch)}
        className={cn(
          "shipping-branch-option",
          selected && "shipping-branch-option-selected",
        )}
      >
        <MapPin
          className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {branch.name}
            {branch.code && !String(branch.code).startsWith("x") ? (
              <span className="ml-1.5 font-normal text-zinc-400">
                · {branch.code}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
            {branch.city}, {branch.state}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {branch.address}
          </span>
        </span>
        {selected ? (
          <Check
            className="h-4 w-4 shrink-0 text-teal-600"
            aria-hidden="true"
          />
        ) : null}
      </button>
    </li>
  );
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

  const trimmedQuery = query.trim();
  const canNationalSearch = trimmedQuery.length >= 2;
  const hasLocationScope = Boolean(state);
  const showResults = canNationalSearch || hasLocationScope;

  const results = useMemo(() => {
    if (!showResults) return [];

    if (canNationalSearch && !state) {
      return searchCarrierBranches(carrier, trimmedQuery, 50);
    }

    if (state && city) {
      if (trimmedQuery) {
        return searchCarrierBranches(carrier, trimmedQuery, 100, {
          state,
          city,
        });
      }
      return getCarrierBranchesByLocation(carrier, state, city);
    }

    if (state) {
      if (trimmedQuery) {
        return searchCarrierBranches(carrier, trimmedQuery, 80, { state });
      }
      return getCarrierBranchesByLocation(carrier, state, null).slice(0, 100);
    }

    return [];
  }, [carrier, state, city, trimmedQuery, canNationalSearch, showResults]);

  if (selectedBranch) {
    return (
      <div className="shipping-branch-picker">
        <div className="shipping-branch-picker-header">
          <p className="shipping-branch-picker-eyebrow">
            Oficina / Sucursal de retiro
          </p>
          <p className="shipping-branch-picker-title">
            Sucursal {carrierLabel}{" "}
            <span className="font-normal text-zinc-400">(opcional)</span>
          </p>
          <p className="shipping-branch-picker-desc">
            Opcional: Si no conoces la agencia exacta, puedes coordinarla luego
            por WhatsApp.
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
        <p className="shipping-branch-picker-eyebrow">
          Oficina / Sucursal de retiro
        </p>
        <p className="shipping-branch-picker-title">
          Sucursal {carrierLabel}{" "}
          <span className="font-normal text-zinc-400">(opcional)</span>
        </p>
        <p className="shipping-branch-picker-desc">
          Opcional: Si no conoces la agencia exacta, puedes coordinarla luego
          por WhatsApp.
        </p>
      </div>

      <div className="shipping-branch-browse">
        <label className="shipping-branch-search">
          <Search
            className="h-4 w-4 shrink-0 text-zinc-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Opcional: buscar oficina, ciudad o código…"
            className="shipping-branch-search-input"
            autoComplete="off"
          />
        </label>

        <div className="shipping-branch-filters">
          <label className="shipping-branch-filter">
            <span className="shipping-branch-sublabel">Estado</span>
            <select
              value={state}
              onChange={(event) => {
                setState(event.target.value);
                setCity("");
              }}
              className="shipping-branch-select"
            >
              <option value="">Todos / buscar nacional</option>
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
              onChange={(event) => setCity(event.target.value)}
              className="shipping-branch-select"
            >
              <option value="">
                {state ? "Todas las ciudades" : "Primero elige el estado"}
              </option>
              {cities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {showResults ? (
          <>
            <p className="shipping-branch-count">
              {results.length}{" "}
              {results.length === 1 ? "oficina" : "oficinas"}
              {canNationalSearch && !state
                ? ` para “${trimmedQuery}”`
                : city
                  ? ` en ${city}, ${state}`
                  : state
                    ? ` en ${state}`
                    : null}
            </p>

            <ul
              className="shipping-branch-list"
              role="listbox"
              aria-label={`Sucursales ${carrierLabel}`}
            >
              {results.length === 0 ? (
                <li className="shipping-branch-empty">
                  No encontramos oficinas con ese criterio. Prueba otra ciudad
                  o escribe menos filtros.
                </li>
              ) : (
                results.map((branch) => (
                  <BranchOption
                    key={branch.id}
                    branch={branch}
                    selected={value === branch.id}
                    onSelect={onChange}
                  />
                ))
              )}
            </ul>
          </>
        ) : (
          <p className="shipping-branch-empty rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
            Opcional: escribe al menos 2 letras para buscar en todo el país, o
            elige un estado. Si no la conoces aún, puedes continuar y
            coordinarla luego por WhatsApp.
          </p>
        )}
      </div>
    </div>
  );
}
