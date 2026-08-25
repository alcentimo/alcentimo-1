"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import {
  SettingsSection,
  SettingsTabShell,
} from "@/components/dashboard/settings/SettingsLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSupplierHubProfile } from "@/lib/supplier/profile-actions";
import type { SupplierHubProfile } from "@/lib/supplier/profile-types";

export function SupplierHubProfilePanel({
  initialProfile,
}: {
  initialProfile: SupplierHubProfile;
}) {
  const [warehouseAddress, setWarehouseAddress] = useState(
    initialProfile.warehouseAddress,
  );
  const [pickupHours, setPickupHours] = useState(initialProfile.pickupHours);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const canSave =
    warehouseAddress.trim().length >= 8 &&
    pickupHours.trim().length >= 4 &&
    !saving;

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await saveSupplierHubProfile({
      warehouseAddress,
      pickupHours,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.profile) {
      setWarehouseAddress(result.profile.warehouseAddress);
      setPickupHours(result.profile.pickupHours);
    }
    setSaved(true);
  }

  return (
    <SettingsTabShell
      error={error}
      saving={saving}
      saveDisabled={!canSave}
      onSave={handleSave}
      saveLabel="Guardar datos de recogida"
      saveHint={
        saved
          ? "Dirección y horarios guardados. Alcéntimo los usa para retirar el producto."
          : "Obligatorio para que Alcéntimo sepa dónde y cuándo recoger."
      }
    >
      <SettingsSection
        title="Cuenta de proveedor"
        description="Eres un mayorista. Alcéntimo compra tu stock y lo retira en tu almacén; no gestiones vitrina ni pagos al detal desde este panel."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Empresa</Label>
            <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {initialProfile.companyName || "—"}
            </p>
          </div>
          <div>
            <Label>Contacto</Label>
            <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {initialProfile.contactName || "—"}
            </p>
          </div>
          <div>
            <Label>Correo</Label>
            <p className="mt-2 break-all text-sm text-zinc-700 dark:text-zinc-300">
              {initialProfile.email || "—"}
            </p>
          </div>
          <div>
            <Label>Teléfono</Label>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              {initialProfile.phone || "—"}
            </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Recogida de Alcéntimo"
        description="Alcéntimo o su transporte va físicamente a retirar el producto. Completa la dirección del almacén y los horarios de retiro."
      >
        <div>
          <Label htmlFor="supplier-warehouse-address">
            Dirección física de almacén/tienda *
          </Label>
          <textarea
            id="supplier-warehouse-address"
            required
            value={warehouseAddress}
            onChange={(event) =>
              setWarehouseAddress(event.target.value.slice(0, 400))
            }
            className="input-field payment-field-textarea mt-2 min-h-[4.5rem] resize-y"
            placeholder="Calle, número, urbanización, ciudad, referencias de acceso"
          />
        </div>
        <div>
          <Label htmlFor="supplier-pickup-hours">Horarios de retiro *</Label>
          <Input
            id="supplier-pickup-hours"
            required
            value={pickupHours}
            onChange={(event) => setPickupHours(event.target.value.slice(0, 200))}
            className="mt-2"
            placeholder="Lun–Vie 8:00–16:00 · Sáb 8:00–12:00"
          />
          <p className="mt-1 inline-flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-500">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            El dropshipper no recoge aquí: solo Alcéntimo o su delivery.
          </p>
        </div>
      </SettingsSection>
    </SettingsTabShell>
  );
}
