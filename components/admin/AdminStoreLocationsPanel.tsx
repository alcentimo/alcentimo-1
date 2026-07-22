"use client";

import { useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import {
  adminSetExtraLocationsAuthorized,
  searchAdminStoresForLocations,
  type AdminStoreLocationRow,
} from "@/lib/admin/store-locations-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function AdminStoreLocationsPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<AdminStoreLocationRow[]>([]);
  const [selected, setSelected] = useState<AdminStoreLocationRow | null>(null);
  const [extraInput, setExtraInput] = useState("0");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runSearch() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const rows = await searchAdminStoresForLocations(searchQuery);
        setResults(rows);
        if (rows.length === 1) {
          setSelected(rows[0]);
          setExtraInput(String(rows[0].extraAuthorized));
        }
      } catch (searchError) {
        setError(
          searchError instanceof Error
            ? searchError.message
            : "No se pudo buscar tiendas.",
        );
      }
    });
  }

  function handleSave() {
    if (!selected) {
      setError("Selecciona una tienda.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await adminSetExtraLocationsAuthorized({
        ownerId: selected.ownerId,
        extraAuthorized: Number(extraInput) || 0,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage("Sedes extras autorizadas actualizadas.");
      const nextExtra = Math.max(0, Math.floor(Number(extraInput) || 0));
      setSelected({
        ...selected,
        extraAuthorized: nextExtra,
        maxAllowed: selected.includedLocations + nextExtra,
      });
      setResults((prev) =>
        prev.map((row) =>
          row.id === selected.id
            ? {
                ...row,
                extraAuthorized: nextExtra,
                maxAllowed: row.includedLocations + nextExtra,
              }
            : row,
        ),
      );
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
        Autoriza sedes adicionales sobre las incluidas en el plan del dueño.
        Enterprise incluye 3 por defecto; el add-on se cobra según{" "}
        <code className="text-xs">plan_settings.extra_location_monthly_usd</code>.
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="loc-search">Buscar tienda</Label>
          <Input
            id="loc-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nombre o slug…"
            className="mt-1.5"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
          />
        </div>
        <Button type="button" onClick={runSearch} disabled={pending || !searchQuery.trim()}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          Buscar
        </Button>
      </div>

      {results.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Tienda</th>
                <th className="px-3 py-2 font-medium">Plan</th>
                <th className="px-3 py-2 font-medium">Sedes</th>
                <th className="px-3 py-2 font-medium">Límite</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr
                  key={row.id}
                  className={
                    selected?.id === row.id
                      ? "bg-teal-50/70 dark:bg-teal-950/30"
                      : "border-t border-zinc-100 dark:border-zinc-800"
                  }
                >
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-left font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                      onClick={() => {
                        setSelected(row);
                        setExtraInput(String(row.extraAuthorized));
                      }}
                    >
                      {row.name}
                    </button>
                    <p className="text-[11px] text-zinc-500">{row.slug}</p>
                    {row.ownerEmail ? (
                      <p className="text-[11px] text-zinc-400">{row.ownerEmail}</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs">{row.plan}</td>
                  <td className="px-3 py-2">{row.locationCount}</td>
                  <td className="px-3 py-2 text-xs">
                    {row.includedLocations}+{row.extraAuthorized} = {row.maxAllowed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selected ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {selected.name}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Plan {selected.plan} · {selected.includedLocations} incluidas · add-on $
            {selected.extraLocationMonthlyUsd}/mes
          </p>
          <div className="mt-3 max-w-xs">
            <Label htmlFor="extra-auth">Sedes extras autorizadas</Label>
            <Input
              id="extra-auth"
              type="number"
              min={0}
              max={50}
              step={1}
              value={extraInput}
              onChange={(e) => setExtraInput(e.target.value)}
              className="mt-1.5"
              disabled={pending}
            />
          </div>
          <Button
            type="button"
            className="mt-3"
            onClick={handleSave}
            disabled={pending}
          >
            Guardar autorización
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          {message}
        </p>
      ) : null}
    </div>
  );
}
