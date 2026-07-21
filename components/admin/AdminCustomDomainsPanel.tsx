"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Search, ShieldCheck, Trash2 } from "lucide-react";
import {
  adminAssignStoreCustomDomain,
  adminRemoveStoreCustomDomain,
  adminVerifyStoreCustomDomain,
  searchAdminStoresForDomain,
  type AdminStoreDomainRow,
} from "@/lib/admin/custom-domain-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getCustomDomainCnameTarget } from "@/lib/domains/custom-domain";

interface AdminCustomDomainsPanelProps {
  initialRows: AdminStoreDomainRow[];
}

export function AdminCustomDomainsPanel({
  initialRows,
}: AdminCustomDomainsPanelProps) {
  const [rows, setRows] = useState(initialRows);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminStoreDomainRow[]>([]);
  const [selectedStore, setSelectedStore] = useState<AdminStoreDomainRow | null>(
    null,
  );
  const [domainInput, setDomainInput] = useState("");
  const [markVerified, setMarkVerified] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cnameTarget = useMemo(() => getCustomDomainCnameTarget(), []);

  function runSearch() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const results = await searchAdminStoresForDomain(searchQuery);
        setSearchResults(results);
        if (results.length === 1) {
          setSelectedStore(results[0]);
          setDomainInput(results[0].customDomain ?? "");
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

  function handleAssign() {
    if (!selectedStore) {
      setError("Selecciona una tienda.");
      return;
    }

    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await adminAssignStoreCustomDomain({
        storeId: selectedStore.id,
        domain: domainInput,
        verified: markVerified,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setMessage("Dominio asignado correctamente.");
      const updated: AdminStoreDomainRow = {
        ...selectedStore,
        customDomain: domainInput.trim() || null,
        customDomainVerified: markVerified && Boolean(domainInput.trim()),
        customDomainVerifiedAt: markVerified ? new Date().toISOString() : null,
      };
      setSelectedStore(updated);
      setRows((current) => {
        const without = current.filter((row) => row.id !== updated.id);
        return updated.customDomain ? [updated, ...without] : without;
      });
    });
  }

  function handleVerify(store: AdminStoreDomainRow) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await adminVerifyStoreCustomDomain(store.id);
      if (result.error) {
        setError(result.error);
        return;
      }

      setMessage(`Dominio verificado para ${store.name}.`);
      const updated = {
        ...store,
        customDomainVerified: true,
        customDomainVerifiedAt: new Date().toISOString(),
      };
      setRows((current) =>
        current.map((row) => (row.id === store.id ? updated : row)),
      );
      if (selectedStore?.id === store.id) {
        setSelectedStore(updated);
      }
    });
  }

  function handleRemove(store: AdminStoreDomainRow) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await adminRemoveStoreCustomDomain(store.id);
      if (result.error) {
        setError(result.error);
        return;
      }

      setMessage(`Dominio eliminado de ${store.name}.`);
      setRows((current) => current.filter((row) => row.id !== store.id));
      if (selectedStore?.id === store.id) {
        setSelectedStore({
          ...store,
          customDomain: null,
          customDomainVerified: false,
        });
        setDomainInput("");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Asignar dominio a una tienda
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Para casos donde la plataforma compra y configura el dominio del cliente.
          Destino CNAME recomendado: <strong>{cnameTarget}</strong>
        </p>

        <div className="mt-4 grid gap-3">
          <div>
            <Label htmlFor="admin-domain-search">Buscar tienda</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="admin-domain-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Nombre o slug de tienda"
              />
              <Button type="button" variant="outline" onClick={runSearch} disabled={pending}>
                <Search className="h-4 w-4" aria-hidden="true" />
                Buscar
              </Button>
            </div>
          </div>

          {searchResults.length > 0 ? (
            <div className="space-y-2">
              <Label>Tiendas encontradas</Label>
              <div className="flex flex-wrap gap-2">
                {searchResults.map((store) => (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => {
                      setSelectedStore(store);
                      setDomainInput(store.customDomain ?? "");
                    }}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                      selectedStore?.id === store.id
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                    }`}
                  >
                    <span className="block font-semibold">{store.name}</span>
                    <span className="opacity-80">{store.slug}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {selectedStore ? (
            <>
              <div>
                <Label htmlFor="admin-custom-domain">Dominio personalizado</Label>
                <Input
                  id="admin-custom-domain"
                  value={domainInput}
                  onChange={(event) => setDomainInput(event.target.value)}
                  placeholder="tienda.cliente.com"
                  className="mt-1.5"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={markVerified}
                  onChange={(event) => setMarkVerified(event.target.checked)}
                  className="rounded border-zinc-300"
                />
                Marcar como verificado al guardar
              </label>

              <Button type="button" onClick={handleAssign} disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Guardando…
                  </>
                ) : (
                  "Asignar dominio"
                )}
              </Button>
            </>
          ) : null}
        </div>
      </div>

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

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Dominios configurados
          </h3>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">
            No hay dominios personalizados registrados.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {row.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {row.slug} · {row.customDomain}
                  </p>
                  <p className="mt-1 text-xs">
                    {row.customDomainVerified ? (
                      <span className="text-emerald-700 dark:text-emerald-300">
                        Verificado
                      </span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-300">
                        Pendiente
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!row.customDomainVerified ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerify(row)}
                      disabled={pending}
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Verificar
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemove(row)}
                    disabled={pending}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Quitar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
