"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Tag, X } from "lucide-react";
import { SavingHint } from "@/components/dashboard/settings/SavingHint";
import { SettingsTabShell } from "@/components/dashboard/settings/SettingsLayout";
import {
  CouponProductPicker,
  type CouponProductOption,
} from "@/components/dashboard/settings/CouponProductPicker";
import {
  createCoupon,
  deleteCoupon,
  toggleCouponActive,
} from "@/lib/coupons/actions";
import {
  formatCouponDiscountLabel,
  formatCouponScopeLabel,
} from "@/lib/coupons/discount";
import {
  formatCouponDate,
  getCouponDateStatus,
} from "@/lib/coupons/dates";
import type { Coupon, CouponDiscountType } from "@/lib/coupons/types";
import { formatUsd } from "@/lib/format";

interface PromotionsTabProps {
  initialCoupons: Coupon[];
  products: CouponProductOption[];
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMaxUses(maxUses: number): string {
  return maxUses <= 0 ? "Ilimitado" : String(maxUses);
}

export function PromotionsTab({ initialCoupons, products }: PromotionsTabProps) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [form, setForm] = useState({
    code: "",
    discountType: "percent" as CouponDiscountType,
    discountPercent: "",
    discountFixedUsd: "",
    maxUses: "0",
    startDate: todayInputValue(),
    endDate: "",
    applyToWholeStore: true,
    selectedProductIds: [] as string[],
  });

  const discountPreview = useMemo(() => {
    if (form.discountType === "fixed") {
      const value = parseFloat(form.discountFixedUsd);
      return Number.isFinite(value) ? `${formatUsd(value)} USD` : "—";
    }
    const value = parseFloat(form.discountPercent);
    return Number.isFinite(value) ? `${value}%` : "—";
  }, [form.discountType, form.discountFixedUsd, form.discountPercent]);

  function resetForm() {
    setForm({
      code: "",
      discountType: "percent",
      discountPercent: "",
      discountFixedUsd: "",
      maxUses: "0",
      startDate: todayInputValue(),
      endDate: "",
      applyToWholeStore: true,
      selectedProductIds: [],
    });
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const maxUses = parseInt(form.maxUses, 10);

    if (!form.code.trim()) return;
    if (!form.endDate.trim()) {
      setError("Selecciona la fecha de fin del cupón.");
      return;
    }
    if (!form.applyToWholeStore && form.selectedProductIds.length === 0) {
      setError("Selecciona al menos un producto o activa 'Aplicar a toda la tienda'.");
      return;
    }

    const discountPercent = parseFloat(form.discountPercent);
    const discountFixedUsd = parseFloat(form.discountFixedUsd);

    setError(null);
    setSaving(true);

    startTransition(async () => {
      const result = await createCoupon({
        code: form.code.trim(),
        discountType: form.discountType,
        discountPercent:
          form.discountType === "percent" && Number.isFinite(discountPercent)
            ? discountPercent
            : undefined,
        discountFixedUsd:
          form.discountType === "fixed" && Number.isFinite(discountFixedUsd)
            ? discountFixedUsd
            : undefined,
        maxUses: Number.isFinite(maxUses) ? maxUses : 0,
        startDate: form.startDate,
        endDate: form.endDate,
        isGlobal: form.applyToWholeStore,
        productIds: form.selectedProductIds,
      });
      setSaving(false);

      if (result.error) {
        setError(result.error);
        return;
      }

      window.location.reload();
    });
  }

  function handleToggle(coupon: Coupon) {
    setError(null);
    setTogglingId(coupon.id);

    startTransition(async () => {
      const result = await toggleCouponActive(coupon.id, !coupon.is_active);
      setTogglingId(null);

      if (result.error) {
        setError(result.error);
        return;
      }

      setCoupons((prev) =>
        prev.map((row) =>
          row.id === coupon.id ? { ...row, is_active: !coupon.is_active } : row,
        ),
      );
    });
  }

  function handleDelete(couponId: string) {
    setError(null);
    setRemovingId(couponId);

    startTransition(async () => {
      const result = await deleteCoupon(couponId);
      setRemovingId(null);

      if (result.error) {
        setError(result.error);
        return;
      }

      setCoupons((prev) => prev.filter((coupon) => coupon.id !== couponId));
    });
  }

  return (
    <SettingsTabShell error={error} hideSaveBar>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Cupones de descuento
          </h2>
          <p className="max-w-lg text-sm text-zinc-500 dark:text-zinc-400">
            Define descuentos por porcentaje o monto fijo, con alcance global o por
            productos específicos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm((value) => !value);
          }}
          className="btn-brand shrink-0 gap-2 self-start shadow-sm"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo cupón
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="settings-option-card space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Crear cupón
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Configura código, descuento, vigencia y alcance del cupón.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="touch-target rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              aria-label="Cerrar formulario"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="coupon-code" className="label-field">
                Código
              </label>
              <input
                id="coupon-code"
                required
                maxLength={32}
                value={form.code}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
                  }))
                }
                placeholder="VERANO20"
                className="input-field uppercase"
              />
            </div>
            <div>
              <label htmlFor="coupon-max-uses" className="label-field">
                Máximo de usos
              </label>
              <input
                id="coupon-max-uses"
                type="number"
                min={0}
                step={1}
                value={form.maxUses}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, maxUses: e.target.value }))
                }
                placeholder="0 = ilimitado"
                className="input-field"
              />
            </div>
          </div>

          <div className="space-y-4">
            <p className="label-field mb-0">Tipo de descuento</p>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700">
                <input
                  type="radio"
                  name="discount-type"
                  checked={form.discountType === "percent"}
                  onChange={() =>
                    setForm((prev) => ({ ...prev, discountType: "percent" }))
                  }
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                Porcentaje (%)
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-700">
                <input
                  type="radio"
                  name="discount-type"
                  checked={form.discountType === "fixed"}
                  onChange={() =>
                    setForm((prev) => ({ ...prev, discountType: "fixed" }))
                  }
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                Monto fijo (USD)
              </label>
            </div>

            {form.discountType === "percent" ? (
              <div>
                <label htmlFor="coupon-percent" className="label-field">
                  Descuento (%)
                </label>
                <input
                  id="coupon-percent"
                  type="number"
                  required
                  min={1}
                  max={100}
                  step="1"
                  value={form.discountPercent}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, discountPercent: e.target.value }))
                  }
                  placeholder="10"
                  className="input-field"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="coupon-fixed" className="label-field">
                  Monto de descuento (USD)
                </label>
                <input
                  id="coupon-fixed"
                  type="number"
                  required
                  min={0.01}
                  step="0.01"
                  value={form.discountFixedUsd}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, discountFixedUsd: e.target.value }))
                  }
                  placeholder="5.00"
                  className="input-field"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="coupon-start-date" className="label-field">
                Fecha de inicio
              </label>
              <input
                id="coupon-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="coupon-end-date" className="label-field">
                Fecha de fin <span className="text-red-500">*</span>
              </label>
              <input
                id="coupon-end-date"
                type="date"
                required
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="input-field"
              />
            </div>
          </div>

          <div className="space-y-4 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <p className="label-field mb-0">Alcance del cupón</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {form.applyToWholeStore
                    ? "Aplicar a toda la tienda"
                    : "Seleccionar productos específicos"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {form.applyToWholeStore
                    ? "El descuento aplica a cualquier producto del inventario."
                    : "Elige los productos elegibles con el buscador."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.applyToWholeStore}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    applyToWholeStore: !prev.applyToWholeStore,
                    selectedProductIds: !prev.applyToWholeStore
                      ? []
                      : prev.selectedProductIds,
                  }))
                }
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                  form.applyToWholeStore
                    ? "bg-emerald-600"
                    : "bg-zinc-300 dark:bg-zinc-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    form.applyToWholeStore ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {!form.applyToWholeStore && (
              <CouponProductPicker
                products={products}
                selectedIds={form.selectedProductIds}
                onChange={(selectedProductIds) =>
                  setForm((prev) => ({ ...prev, selectedProductIds }))
                }
              />
            )}
          </div>

          <div className="rounded-xl bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            Resumen: <strong>{discountPreview}</strong> de descuento ·{" "}
            {form.applyToWholeStore
              ? "toda la tienda"
              : `${form.selectedProductIds.length} producto(s)`}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            {saving && <SavingHint visible />}
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary px-6"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-brand px-6 shadow-sm disabled:opacity-60"
            >
              {saving ? "Creando…" : "Crear cupón"}
            </button>
          </div>
        </form>
      )}

      {coupons.length === 0 ? (
        <div className="settings-option-card py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <Tag className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            No tienes cupones creados
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Crea uno con el botón &quot;Nuevo cupón&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {coupons.map((coupon) => {
            const exhausted =
              coupon.max_uses > 0 && coupon.use_count >= coupon.max_uses;
            const dateStatus = getCouponDateStatus(coupon);

            return (
              <article key={coupon.id} className="settings-option-card">
                <div className="settings-option-row items-start">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      <Tag className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-base font-semibold text-zinc-900 dark:text-zinc-50">
                        {coupon.code}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {formatCouponDiscountLabel(coupon)} ·{" "}
                        {formatCouponScopeLabel(coupon)}
                      </p>
                      <p className="mt-2 text-xs text-zinc-400">
                        Vigencia: {formatCouponDate(coupon.start_date)} —{" "}
                        {formatCouponDate(coupon.end_date)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Usos: {coupon.use_count}
                        {coupon.max_uses > 0 ? ` / ${coupon.max_uses}` : " · Ilimitado"}
                      </p>
                      {dateStatus === "expired" && (
                        <p className="mt-1 text-xs text-amber-600">Expirado</p>
                      )}
                      {dateStatus === "scheduled" && (
                        <p className="mt-1 text-xs text-sky-600">Programado</p>
                      )}
                      {exhausted && (
                        <p className="mt-1 text-xs text-amber-600">Límite alcanzado</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <span
                      className={
                        dateStatus === "active" && coupon.is_active
                          ? "stock-badge stock-badge-ok"
                          : "stock-badge stock-badge-low"
                      }
                    >
                      {dateStatus === "expired"
                        ? "Expirado"
                        : dateStatus === "scheduled"
                          ? "Programado"
                          : coupon.is_active
                            ? "Activo"
                            : "Inactivo"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggle(coupon)}
                      disabled={togglingId === coupon.id}
                      className="btn-secondary px-3 py-2 text-xs disabled:opacity-60"
                    >
                      {togglingId === coupon.id
                        ? "…"
                        : coupon.is_active
                          ? "Desactivar"
                          : "Activar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(coupon.id)}
                      disabled={removingId === coupon.id}
                      className="btn-secondary px-3 py-2 text-xs disabled:opacity-60"
                    >
                      {removingId === coupon.id ? "Eliminando…" : "Eliminar"}
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-xs text-zinc-400">
                  Máximo permitido: {formatMaxUses(coupon.max_uses)}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </SettingsTabShell>
  );
}
