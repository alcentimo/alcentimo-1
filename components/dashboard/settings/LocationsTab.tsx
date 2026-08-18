import Link from "next/link";
import { useState, useTransition } from "react";
import { Lock, MapPin, Plus, Star, Trash2, Loader2 } from "lucide-react";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  createStoreLocationAction,
  deleteStoreLocationAction,
  setDefaultStoreLocationAction,
  updateStoreLocationAction,
} from "@/lib/locations/actions";
import type { StoreLocation } from "@/lib/locations/types";
import { DASHBOARD_PLANS_HREF, MERCHANT_SUBSCRIPTION_BILLING_ENABLED } from "@/src/config/plans";
import { cn } from "@/lib/cn";

export interface LocationLimitSummary {
  maxAllowed: number;
  includedLocations: number;
  extraAuthorized: number;
  remainingSlots: number;
  extraLocationMonthlyUsd: number;
  planId?: string;
  billableExtraCount?: number;
  monthlyExtraCostUsd?: number;
  nextBranchRequiresExtra?: boolean;
  nextBranchMonthlyCostUsd?: number;
}

interface LocationsTabProps {
  initialLocations: StoreLocation[];
  locationLimit?: LocationLimitSummary | null;
}

export function LocationsTab({
  initialLocations,
  locationLimit = null,
}: LocationsTabProps) {
  const [locations, setLocations] = useState(initialLocations);
  const [limit, setLimit] = useState(locationLimit);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  const maxAllowed = limit?.maxAllowed ?? 1;
  const canAdd = locations.length < maxAllowed;
  const multiLocationUnlocked =
    !MERCHANT_SUBSCRIPTION_BILLING_ENABLED || limit?.planId === "enterprise";

  function refreshMessage(next: string | null, err?: string) {
    setError(err ?? null);
    setSuccess(err ? null : next);
  }

  function handleCreate() {
    refreshMessage(null);
    startTransition(async () => {
      const result = await createStoreLocationAction({
        name,
        address,
        city,
        phone,
      });
      if (result.limit) {
        setLimit(result.limit);
      }
      if (result.error) {
        refreshMessage(null, result.error);
        return;
      }
      if (result.location) {
        setLocations((prev) => [...prev, result.location!]);
      }
      setName("");
      setAddress("");
      setCity("");
      setPhone("");
      refreshMessage(result.extraBranchNotice ?? "Sucursal creada.");
    });
  }

  function handleUpdate(location: StoreLocation, patch: Partial<StoreLocation>) {
    refreshMessage(null);
    startTransition(async () => {
      const result = await updateStoreLocationAction({
        locationId: location.id,
        name: patch.name ?? location.name,
        address: patch.address ?? location.address,
        city: patch.city ?? location.city,
        phone: patch.phone ?? location.phone ?? undefined,
        isActive: patch.is_active ?? location.is_active,
      });
      if (result.error) {
        refreshMessage(null, result.error);
        return;
      }
      if (result.location) {
        setLocations((prev) =>
          prev.map((row) => (row.id === location.id ? result.location! : row)),
        );
      }
      refreshMessage("Sucursal actualizada.");
    });
  }

  function handleSetDefault(locationId: string) {
    refreshMessage(null);
    startTransition(async () => {
      const result = await setDefaultStoreLocationAction(locationId);
      if (result.error) {
        refreshMessage(null, result.error);
        return;
      }
      setLocations((prev) =>
        prev.map((row) => ({
          ...row,
          is_default: row.id === locationId,
          is_active: row.id === locationId ? true : row.is_active,
        })),
      );
      refreshMessage("Sucursal principal actualizada.");
    });
  }

  function handleDelete(locationId: string) {
    refreshMessage(null);
    startTransition(async () => {
      const result = await deleteStoreLocationAction(locationId);
      if (result.error) {
        refreshMessage(null, result.error);
        return;
      }
      setLocations((prev) => prev.filter((row) => row.id !== locationId));
      refreshMessage("Sucursal eliminada.");
    });
  }

  return (
    <SettingsTabShell hideSaveBar error={error}>
      {success ? (
        <p
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          role="status"
        >
          {success}
        </p>
      ) : null}

      <SettingsSection
        title="Sucursales"
        description={
          limit
            ? MERCHANT_SUBSCRIPTION_BILLING_ENABLED
              ? `Usas ${locations.length} de ${limit.maxAllowed} sucursales autorizadas (${limit.includedLocations} incluidas en tu plan${limit.extraAuthorized > 0 ? ` + ${limit.extraAuthorized} extras` : ""}).`
              : `Usas ${locations.length} de ${limit.maxAllowed} sucursales.`
            : "Gestiona las ubicaciones de tu tienda. El stock de productos se controla por sede."
        }
        variant="payments"
      >
        {!multiLocationUnlocked ? (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-teal-200/80 bg-teal-50/60 px-3 py-3 text-xs text-teal-900 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-200">
            <Lock
              className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-teal-950 dark:text-teal-50">
                Multi-sucursal exclusivo de Corporativo
              </p>
              <p className="mt-1 leading-relaxed text-teal-900/85 dark:text-teal-100/85">
                Incluye hasta 3 sedes con stock independiente
                {limit
                  ? ` y extras a +$${limit.extraLocationMonthlyUsd}/mes`
                  : ""}
                . Tu plan actual permite 1 ubicación.
              </p>
              <Link
                href={DASHBOARD_PLANS_HREF}
                className="mt-2 inline-flex text-xs font-semibold text-teal-800 underline underline-offset-2 hover:text-teal-950 dark:text-teal-300 dark:hover:text-teal-100"
              >
                Actualizar a Corporativo →
              </Link>
            </div>
          </div>
        ) : null}
        {multiLocationUnlocked && limit && (limit.billableExtraCount ?? 0) > 0 && MERCHANT_SUBSCRIPTION_BILLING_ENABLED ? (
          <div className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            Tienes {limit.billableExtraCount} sucursal
            {limit.billableExtraCount === 1 ? "" : "es"} extra
            {(limit.monthlyExtraCostUsd ?? 0) > 0
              ? ` (+$${limit.monthlyExtraCostUsd} USD/mes en total).`
              : "."}
          </div>
        ) : null}
        <div className="space-y-3">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              disabled={pending}
              canDelete={locations.length > 1 && !location.is_default}
              onSave={(patch) => handleUpdate(location, patch)}
              onSetDefault={() => handleSetDefault(location.id)}
              onDelete={() => handleDelete(location.id)}
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Nueva sucursal"
        description={
          !multiLocationUnlocked
            ? "Función exclusiva del plan Corporativo: agrega sedes con stock independiente."
            : canAdd
              ? "Agrega otra sede con su propia dirección y stock."
              : MERCHANT_SUBSCRIPTION_BILLING_ENABLED
                ? `Has alcanzado el máximo autorizado (${maxAllowed}). Solicita sedes extras a soporte (+$${limit?.extraLocationMonthlyUsd ?? 6}/mes c/u).`
                : `Has alcanzado el máximo de ${maxAllowed} sucursales.`
        }
        variant="payments"
      >
        {!multiLocationUnlocked ? (
          <EnterpriseLockedNewLocationCard
            extraLocationMonthlyUsd={limit?.extraLocationMonthlyUsd ?? 6}
          />
        ) : (
          <>
            {canAdd && limit?.nextBranchRequiresExtra ? (
              <div className="mb-3 rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                La sucursal #{locations.length + 1} es extra: se aplicará un cargo
                de{" "}
                <strong>
                  +$
                  {limit.nextBranchMonthlyCostUsd ??
                    limit.extraLocationMonthlyUsd}{" "}
                  USD/mes
                </strong>{" "}
                por sede adicional en tu plan Corporativo.
              </div>
            ) : null}
            {canAdd ? (
              <div className="general-settings-card space-y-3">
                <div>
                  <Label
                    htmlFor="new-location-name"
                    className="payment-field-label"
                  >
                    Nombre
                  </Label>
                  <Input
                    id="new-location-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Sede Este"
                    className="payment-field-input mt-1.5"
                    disabled={pending}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label
                      htmlFor="new-location-city"
                      className="payment-field-label"
                    >
                      Ciudad
                    </Label>
                    <Input
                      id="new-location-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Caracas"
                      className="payment-field-input mt-1.5"
                      disabled={pending}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="new-location-phone"
                      className="payment-field-label"
                    >
                      Teléfono
                    </Label>
                    <Input
                      id="new-location-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0412…"
                      className="payment-field-input mt-1.5"
                      disabled={pending}
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="new-location-address"
                    className="payment-field-label"
                  >
                    Dirección
                  </Label>
                  <Input
                    id="new-location-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle, referencia…"
                    className="payment-field-input mt-1.5"
                    disabled={pending}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={pending || !name.trim()}
                >
                  {pending ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  )}
                  Agregar sucursal
                </Button>
              </div>
            ) : null}
          </>
        )}
      </SettingsSection>
    </SettingsTabShell>
  );
}

function EnterpriseLockedNewLocationCard({
  extraLocationMonthlyUsd,
}: {
  extraLocationMonthlyUsd: number;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/40"
      role="group"
      aria-label="Agregar sucursal bloqueado. Exclusivo del plan Corporativo."
    >
      <div
        className="pointer-events-none select-none space-y-3 p-4 opacity-45"
        aria-hidden="true"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Nueva sede
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <Lock className="h-3 w-3" />
            Corporativo
          </span>
        </div>
        <div className="h-9 rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-9 rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950" />
          <div className="h-9 rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950" />
        </div>
        <div className="h-9 rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950" />
        <div className="h-9 w-40 rounded-lg bg-zinc-300 dark:bg-zinc-700" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/55 via-white/80 to-white/90 p-4 dark:from-zinc-950/40 dark:via-zinc-950/75 dark:to-zinc-950/90">
        <div className="max-w-sm text-center">
          <span className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="inline-flex items-center gap-1.5 rounded-md border border-teal-200/80 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-200">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Exclusivo Corporativo
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Desbloquea multi-sucursal
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Hasta 3 sedes incluidas con stock por ubicación
            {extraLocationMonthlyUsd > 0
              ? `, y extras a +$${extraLocationMonthlyUsd}/mes`
              : ""}
            .
          </p>
          <Link
            href={DASHBOARD_PLANS_HREF}
            className="btn-brand mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium"
          >
            Actualizar a Corporativo
          </Link>
        </div>
      </div>
    </div>
  );
}

function LocationCard({
  location,
  disabled,
  canDelete,
  onSave,
  onSetDefault,
  onDelete,
}: {
  location: StoreLocation;
  disabled: boolean;
  canDelete: boolean;
  onSave: (patch: Partial<StoreLocation>) => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(location.name);
  const [address, setAddress] = useState(location.address);
  const [city, setCity] = useState(location.city);
  const [phone, setPhone] = useState(location.phone ?? "");
  const [isActive, setIsActive] = useState(location.is_active);

  const dirty =
    name !== location.name ||
    address !== location.address ||
    city !== location.city ||
    phone !== (location.phone ?? "") ||
    isActive !== location.is_active;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        location.is_active
          ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          : "border-zinc-200/70 bg-zinc-50 opacity-80 dark:border-zinc-800 dark:bg-zinc-900/40",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <MapPin className="h-4 w-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {location.name}
        </span>
        {location.is_default ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
            <Star className="h-3 w-3" aria-hidden="true" />
            Principal
          </span>
        ) : null}
        {!location.is_active ? (
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            Inactiva
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="payment-field-label">Nombre</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="payment-field-input mt-1.5"
            disabled={disabled}
          />
        </div>
        <div>
          <Label className="payment-field-label">Ciudad</Label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="payment-field-input mt-1.5"
            disabled={disabled}
          />
        </div>
        <div>
          <Label className="payment-field-label">Teléfono</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="payment-field-input mt-1.5"
            disabled={disabled}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="payment-field-label">Dirección</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="payment-field-input mt-1.5"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={disabled || location.is_default}
          />
          Activa
        </label>
        <div className="flex-1" />
        {!location.is_default ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSetDefault}
            disabled={disabled || !location.is_active}
          >
            Hacer principal
          </Button>
        ) : null}
        {dirty ? (
          <Button
            type="button"
            size="sm"
            onClick={() =>
              onSave({
                name,
                address,
                city,
                phone: phone || null,
                is_active: isActive,
              })
            }
            disabled={disabled || !name.trim()}
          >
            Guardar
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={disabled}
            className="text-red-600 dark:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Eliminar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
