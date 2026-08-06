"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import {
  deleteSubscriptionPaymentMethod,
  toggleSubscriptionPaymentMethod,
  uploadSubscriptionPaymentQr,
  upsertSubscriptionPaymentMethod,
} from "@/lib/admin/payment-methods-actions";
import type { SubscriptionPaymentMethod } from "@/src/config/subscription-pago-movil";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { PaymentQrImageField } from "@/components/payments/PaymentQrImageField";
import { cn } from "@/lib/cn";
import { Plus, Trash2 } from "lucide-react";

interface PaymentMethodsConfigPanelProps {
  initialMethods: SubscriptionPaymentMethod[];
}

type DraftMethod = {
  id: string | null;
  name: string;
  bank: string;
  phone: string;
  ci: string;
  holderName: string;
  qrImageUrl: string;
  isActive: boolean;
};

const EMPTY_DRAFT: DraftMethod = {
  id: null,
  name: "",
  bank: "",
  phone: "",
  ci: "",
  holderName: "",
  qrImageUrl: "",
  isActive: true,
};

function toDraft(method: SubscriptionPaymentMethod): DraftMethod {
  return {
    id: method.id,
    name: method.name,
    bank: method.bank,
    phone: method.phone,
    ci: method.ci,
    holderName: method.holderName,
    qrImageUrl: method.qrImageUrl ?? "",
    isActive: method.isActive,
  };
}

export function PaymentMethodsConfigPanel({
  initialMethods,
}: PaymentMethodsConfigPanelProps) {
  const [methods, setMethods] = useState(initialMethods);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<DraftMethod>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const isEditing = editingId !== null;

  const sortedMethods = useMemo(
    () =>
      [...methods].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.name.localeCompare(b.name, "es");
      }),
    [methods],
  );

  function openCreate() {
    setError(null);
    setSuccess(null);
    setEditingId("new");
    setDraft(EMPTY_DRAFT);
  }

  function openEdit(method: SubscriptionPaymentMethod) {
    setError(null);
    setSuccess(null);
    setEditingId(method.id);
    setDraft(toDraft(method));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    if (draft.id) formData.set("id", draft.id);
    formData.set("name", draft.name);
    formData.set("bank", draft.bank);
    formData.set("phone", draft.phone);
    formData.set("ci", draft.ci);
    formData.set("holderName", draft.holderName);
    formData.set("qrImageUrl", draft.qrImageUrl);
    formData.set("isActive", draft.isActive ? "true" : "false");

    startTransition(async () => {
      const result = await upsertSubscriptionPaymentMethod(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.methods) {
        setMethods(result.methods);
      } else if (result.method) {
        setMethods((prev) => {
          const exists = prev.some((item) => item.id === result.method!.id);
          if (exists) {
            return prev.map((item) =>
              item.id === result.method!.id ? result.method! : item,
            );
          }
          return [...prev, result.method!];
        });
      }
      setSuccess(
        draft.id
          ? "Método de pago actualizado."
          : "Método de pago creado. Ya puede mostrarse en el checkout si está activo.",
      );
      setEditingId(null);
      setDraft(EMPTY_DRAFT);
    });
  }

  function handleToggle(method: SubscriptionPaymentMethod, next: boolean) {
    setError(null);
    setSuccess(null);
    setTogglingId(method.id);
    setMethods((prev) =>
      prev.map((item) =>
        item.id === method.id ? { ...item, isActive: next } : item,
      ),
    );

    startTransition(async () => {
      const result = await toggleSubscriptionPaymentMethod(method.id, next);
      setTogglingId(null);
      if (result.error) {
        setMethods((prev) =>
          prev.map((item) =>
            item.id === method.id ? { ...item, isActive: method.isActive } : item,
          ),
        );
        setError(result.error);
        return;
      }
      if (result.methods) setMethods(result.methods);
      setSuccess(
        next
          ? `"${method.name}" activado en el checkout.`
          : `"${method.name}" desactivado (se conserva en admin).`,
      );
    });
  }

  function handleDelete(method: SubscriptionPaymentMethod) {
    if (
      !window.confirm(
        `¿Eliminar "${method.name}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await deleteSubscriptionPaymentMethod(method.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.methods) setMethods(result.methods);
      if (editingId === method.id) cancelEdit();
      setSuccess("Método de pago eliminado.");
    });
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Métodos de pago de suscripciones
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Gestiona varias cuentas (Pago Móvil, Zelle, transferencia, etc.).
              Solo los métodos activos aparecen en el checkout.
            </p>
          </div>
          <Button
            type="button"
            onClick={openCreate}
            disabled={pending || isEditing}
            className="shrink-0"
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Nuevo método
          </Button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            {success}
          </p>
        ) : null}

        <ul className="mt-5 space-y-3">
          {sortedMethods.map((method) => {
            const isInactive = !method.isActive;
            return (
              <li
                key={method.id}
                className={cn(
                  "rounded-xl border border-zinc-200 p-4 dark:border-zinc-800",
                  isInactive && "opacity-70",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {method.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {method.bank}
                      {method.phone ? ` · ${method.phone}` : ""}
                      {method.ci ? ` · ${method.ci}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-1.5 dark:border-zinc-700">
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                        {method.isActive ? "Activo" : "Inactivo"}
                      </span>
                      <SettingsSwitch
                        id={`pm-active-${method.id}`}
                        label={`${method.isActive ? "Desactivar" : "Activar"} ${method.name}`}
                        checked={method.isActive}
                        onChange={(next) => handleToggle(method, next)}
                        disabled={pending || togglingId === method.id}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(method)}
                      disabled={pending || isEditing}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(method)}
                      disabled={pending || methods.length <= 1}
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {isEditing ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {draft.id ? "Editar método" : "Nuevo método de pago"}
          </h3>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="pm-name">Tipo / Nombre</Label>
              <Input
                id="pm-name"
                value={draft.name}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                disabled={pending}
                className="mt-1.5"
                placeholder="Ej. Pago Móvil Mercantil"
                autoComplete="off"
              />
            </div>

            <div>
              <Label htmlFor="pm-bank">Banco o plataforma</Label>
              <Input
                id="pm-bank"
                value={draft.bank}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, bank: e.target.value }))
                }
                required
                disabled={pending}
                className="mt-1.5"
                placeholder="Ej. Mercantil, Banesco, Zelle"
                autoComplete="off"
              />
            </div>

            <div>
              <Label htmlFor="pm-phone">Teléfono / Correo</Label>
              <Input
                id="pm-phone"
                value={draft.phone}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, phone: e.target.value }))
                }
                required
                disabled={pending}
                className="mt-1.5"
                placeholder="Ej. 04121234567 o pagos@empresa.com"
                autoComplete="off"
              />
            </div>

            <div>
              <Label htmlFor="pm-ci">Cédula / RIF</Label>
              <Input
                id="pm-ci"
                value={draft.ci}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, ci: e.target.value }))
                }
                required
                disabled={pending}
                className="mt-1.5"
                placeholder="Ej. V25074267 o J123456789"
                autoComplete="off"
              />
            </div>

            <div>
              <Label htmlFor="pm-holder">Nombre del titular</Label>
              <Input
                id="pm-holder"
                value={draft.holderName}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, holderName: e.target.value }))
                }
                disabled={pending}
                className="mt-1.5"
                placeholder="Nombre como aparece en el banco"
                autoComplete="off"
              />
            </div>

            <PaymentQrImageField
              id="pm-qr"
              label="Código QR de pago"
              value={draft.qrImageUrl}
              onChange={(url) =>
                setDraft((prev) => ({ ...prev, qrImageUrl: url }))
              }
              disabled={pending}
              uploadFn={uploadSubscriptionPaymentQr}
            />

            <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  Visible en checkout
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {draft.isActive ? "Activo" : "Inactivo"}
                </p>
              </div>
              <SettingsSwitch
                id="pm-draft-active"
                label="Método activo en checkout"
                checked={draft.isActive}
                onChange={(next) =>
                  setDraft((prev) => ({ ...prev, isActive: next }))
                }
                disabled={pending}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando…" : draft.id ? "Guardar cambios" : "Crear método"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={cancelEdit}
                disabled={pending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
