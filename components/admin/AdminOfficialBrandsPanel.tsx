"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  archiveOfficialBrand,
  createOfficialBrand,
  listAdminOfficialBrands,
  updateOfficialBrand,
} from "@/lib/admin/official-brand-actions";
import type { OfficialBrand } from "@/lib/official-brands/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";

export function AdminOfficialBrandsPanel() {
  const [brands, setBrands] = useState<OfficialBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [featured, setFeatured] = useState(true);

  async function reload() {
    const result = await listAdminOfficialBrands();
    if (result.error) {
      setError(result.error);
      return;
    }
    setBrands(result.brands ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await listAdminOfficialBrands();
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBrands(result.brands ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    setMessage(null);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("is_featured", featured ? "true" : "false");
    formData.set("sort_order", String(brands.length));
    if (logo) formData.set("logo", logo);
    const result = await createOfficialBrand(formData);
    setCreating(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    setLogo(null);
    setFeatured(true);
    setMessage(`Marca ${result.brand?.name ?? ""} creada.`);
    await reload();
  }

  async function handleSave(brand: OfficialBrand, patch: FormData) {
    setBusyId(brand.id);
    setError(null);
    setMessage(null);
    const result = await updateOfficialBrand(brand.id, patch);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage("Marca actualizada.");
    await reload();
  }

  async function handleArchive(brand: OfficialBrand) {
    if (
      !window.confirm(
        `¿Quitar ${brand.name} de las marcas oficiales? Los productos asociados quedan sin marca.`,
      )
    ) {
      return;
    }
    setBusyId(brand.id);
    setError(null);
    const result = await archiveOfficialBrand(brand.id);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage(`Se quitó ${brand.name}.`);
    await reload();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Nueva marca destacada
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          Nombre y logo oficiales. Luego asócialos a SKUs mayoristas en Proveedor
          / Mayorista.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej. Ponkesitas"
            maxLength={80}
          />
          <label className="flex min-h-10 cursor-pointer items-center rounded-md border border-dashed border-zinc-300 px-3 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={(event) =>
                setLogo(event.target.files?.[0] ?? null)
              }
            />
            {logo ? logo.name : "Logo"}
          </label>
          <Button
            type="button"
            disabled={creating || name.trim().length < 2}
            onClick={() => void handleCreate()}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Crear
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <SettingsSwitch
            id="new-brand-featured"
            checked={featured}
            label="Mostrar en Marcas destacadas de las vitrinas"
            onChange={setFeatured}
          />
          <span>Mostrar en Marcas destacadas de las vitrinas</span>
        </div>
      </section>

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

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando marcas…
        </p>
      ) : brands.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
          Aún no hay marcas oficiales. Crea Ponkesitas, Keoos u otras aquí.
        </p>
      ) : (
        <ul className="space-y-3">
          {brands.map((brand) => (
            <OfficialBrandRow
              key={brand.id}
              brand={brand}
              busy={busyId === brand.id}
              onSave={handleSave}
              onArchive={handleArchive}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function OfficialBrandRow({
  brand,
  busy,
  onSave,
  onArchive,
}: {
  brand: OfficialBrand;
  busy: boolean;
  onSave: (brand: OfficialBrand, patch: FormData) => Promise<void>;
  onArchive: (brand: OfficialBrand) => Promise<void>;
}) {
  const [name, setName] = useState(brand.name);
  const [logo, setLogo] = useState<File | null>(null);
  const [featured, setFeatured] = useState(brand.isFeatured);
  const [sortOrder, setSortOrder] = useState(String(brand.sortOrder));

  useEffect(() => {
    setName(brand.name);
    setFeatured(brand.isFeatured);
    setSortOrder(String(brand.sortOrder));
    setLogo(null);
  }, [brand]);

  function buildForm() {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("is_featured", featured ? "true" : "false");
    formData.set("sort_order", sortOrder);
    if (logo) formData.set("logo", logo);
    return formData;
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-950">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
        {brand.logoUrl ? (
          <Image
            src={brand.logoUrl}
            alt=""
            fill
            className="object-contain p-1"
            sizes="64px"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={busy}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer text-xs text-zinc-500 underline">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              disabled={busy}
              onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
            />
            {logo ? logo.name : "Cambiar logo"}
          </label>
          <label className="flex items-center gap-1 text-xs text-zinc-500">
            Orden
            <Input
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className="h-8 w-16"
              disabled={busy}
            />
          </label>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <SettingsSwitch
            id={`brand-featured-${brand.id}`}
            checked={featured}
            disabled={busy}
            label="Destacada en vitrinas"
            onChange={setFeatured}
          />
          <span>Destacada en vitrinas</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void onSave(brand, buildForm())}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Guardar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void onArchive(brand)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}
