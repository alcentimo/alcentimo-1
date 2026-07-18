"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import {
  createPromotion,
  deletePromotion,
  togglePromotionActive,
} from "@/lib/promotions/actions";
import type { Promotion } from "@/lib/promotions/types";
import { formatCouponDate, getCouponDateStatus } from "@/lib/coupons/dates";

interface CustomerPromotionsSectionProps {
  initialPromotions: Promotion[];
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CustomerPromotionsSection({
  initialPromotions,
}: CustomerPromotionsSectionProps) {
  const [promotions, setPromotions] = useState(initialPromotions);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    code: "",
    discountPercentage: "10",
    startDate: todayInputValue(),
    endDate: "",
    autoApply: true,
    maxUses: "0",
  });

  const discountPreview = useMemo(() => {
    const value = parseFloat(form.discountPercentage);
    return Number.isFinite(value) ? `${value}%` : "—";
  }, [form.discountPercentage]);

  function resetForm() {
    setForm({
      name: "",
      code: "",
      discountPercentage: "10",
      startDate: todayInputValue(),
      endDate: "",
      autoApply: true,
      maxUses: "0",
    });
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const discountPercentage = parseFloat(form.discountPercentage);
    const maxUses = parseInt(form.maxUses, 10);

    if (!form.name.trim() || !form.code.trim()) return;
    if (!form.endDate.trim()) {
      setError("Selecciona la fecha de fin de la promoción.");
      return;
    }

    setError(null);
    setSaving(true);

    startTransition(async () => {
      const result = await createPromotion({
        name: form.name.trim(),
        code: form.code.trim(),
        discountPercentage,
        startDate: form.startDate,
        endDate: form.endDate,
        autoApply: form.autoApply,
        maxUses: Number.isFinite(maxUses) ? maxUses : 0,
      });

      setSaving(false);
      if (result.error) {
        setError(result.error);
        return;
      }

      window.location.reload();
    });
  }

  function handleToggle(promotion: Promotion) {
    setTogglingId(promotion.id);
    startTransition(async () => {
      const result = await togglePromotionActive(
        promotion.id,
        !promotion.is_active,
      );
      setTogglingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPromotions((current) =>
        current.map((row) =>
          row.id === promotion.id
            ? { ...row, is_active: !promotion.is_active }
            : row,
        ),
      );
    });
  }

  function handleDelete(promotionId: string) {
    setRemovingId(promotionId);
    startTransition(async () => {
      const result = await deletePromotion(promotionId);
      setRemovingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPromotions((current) => current.filter((row) => row.id !== promotionId));
    });
  }

  return (
    <section className="settings-section mb-8 border-b border-zinc-200/80 pb-8 dark:border-zinc-800">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            <Sparkles className="h-4 w-4 text-orange-500" aria-hidden="true" />
            Promociones exclusivas para clientes
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Solo clientes registrados en tu tienda pueden usar estos descuentos.
            Los invitados verán un banner para registrarse.
          </p>
        </div>
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex min-h-9 items-center gap-1.5 px-3 text-xs"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Nueva promoción
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-xl border border-orange-200/80 bg-orange-50/40 p-4 dark:border-orange-900/40 dark:bg-orange-950/20"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="payment-field-label">Nombre</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="inventory-inline-input mt-1 w-full"
                placeholder="Bienvenida clientes VIP"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="payment-field-label">Código</span>
              <input
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({ ...current, code: event.target.value }))
                }
                className="inventory-inline-input mt-1 w-full uppercase"
                placeholder="CLIENTE10"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="payment-field-label">Descuento (%)</span>
              <input
                type="number"
                min={1}
                max={100}
                step={0.1}
                value={form.discountPercentage}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    discountPercentage: event.target.value,
                  }))
                }
                className="inventory-inline-input mt-1 w-full"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="payment-field-label">Vista previa</span>
              <p className="mt-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
                {discountPreview} para clientes registrados
              </p>
            </label>
            <label className="block text-sm">
              <span className="payment-field-label">Inicio</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
                className="inventory-inline-input mt-1 w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="payment-field-label">Fin</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endDate: event.target.value }))
                }
                className="inventory-inline-input mt-1 w-full"
                required
              />
            </label>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={form.autoApply}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  autoApply: event.target.checked,
                }))
              }
            />
            Aplicar automáticamente en checkout para clientes registrados
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="btn-primary min-h-9 px-4 text-xs">
              {saving ? "Guardando…" : "Crear promoción"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
                setError(null);
              }}
              className="min-h-9 rounded-lg border border-zinc-200 px-4 text-xs font-medium dark:border-zinc-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {promotions.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aún no tienes promociones exclusivas. Crea una para incentivar el registro.
        </p>
      ) : (
        <ul className="space-y-3">
          {promotions.map((promotion) => {
            const dateStatus = getCouponDateStatus({
              start_date: promotion.start_date,
              end_date: promotion.end_date,
              is_active: promotion.is_active,
            });

            return (
              <li
                key={promotion.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {promotion.name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Código <strong>{promotion.code}</strong> ·{" "}
                    {Number(promotion.discount_percentage)}% ·{" "}
                    {formatCouponDate(promotion.start_date)} →{" "}
                    {formatCouponDate(promotion.end_date)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {dateStatus} ·{" "}
                    {promotion.auto_apply
                      ? "Auto-aplicar en checkout"
                      : "Código manual en checkout"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(promotion)}
                    disabled={togglingId === promotion.id}
                    className={`min-h-8 rounded-lg px-3 text-xs font-semibold ${
                      promotion.is_active
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    {promotion.is_active ? "Activa" : "Inactiva"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(promotion.id)}
                    disabled={removingId === promotion.id}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    aria-label={`Eliminar promoción ${promotion.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
