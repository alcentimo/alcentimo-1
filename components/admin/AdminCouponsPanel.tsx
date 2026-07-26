"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import type {
  SubscriptionCampaign,
  SubscriptionCoupon,
  SubscriptionCouponRewardType,
} from "@/lib/database.types";
import {
  createSubscriptionCampaign,
  createSubscriptionCoupon,
  toggleSubscriptionCampaign,
  toggleSubscriptionCoupon,
} from "@/lib/admin/subscription-promo-actions";
import {
  formatAdminPromoDate,
  formatSubscriptionCampaignReward,
  formatSubscriptionCouponReward,
  isSubscriptionCouponExpired,
} from "@/components/admin/admin-coupon-formatters";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type CouponsPanelTab = "cupones" | "ofertas";

interface AdminCouponsPanelProps {
  initialCoupons: SubscriptionCoupon[];
  initialCampaigns: SubscriptionCampaign[];
}

export function AdminCouponsPanel({
  initialCoupons,
  initialCampaigns,
}: AdminCouponsPanelProps) {
  const [activeTab, setActiveTab] = useState<CouponsPanelTab>("cupones");
  const [coupons, setCoupons] = useState(initialCoupons);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [rewardType, setRewardType] =
    useState<SubscriptionCouponRewardType>("percent_discount");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeCoupons = useMemo(
    () =>
      coupons.filter(
        (coupon) => coupon.is_active && !isSubscriptionCouponExpired(coupon),
      ),
    [coupons],
  );

  const discountValueLabel =
    rewardType === "percent_discount"
      ? "Porcentaje de descuento (%)"
      : rewardType === "fixed_discount"
        ? "Monto de descuento (USD)"
        : "Días Pro gratis";

  function handleCreateCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createSubscriptionCoupon({
        code: String(form.get("code") ?? ""),
        name: String(form.get("name") ?? ""),
        rewardType,
        discountPercent:
          rewardType === "percent_discount"
            ? Number(form.get("discountValue"))
            : null,
        discountUsd:
          rewardType === "fixed_discount"
            ? Number(form.get("discountValue"))
            : null,
        grantProDays:
          rewardType === "grant_pro_days"
            ? Number(form.get("discountValue"))
            : null,
        maxRedemptions: form.get("maxRedemptions")
          ? Number(form.get("maxRedemptions"))
          : null,
        startsAt: null,
        endsAt: String(form.get("endsAt") ?? "") || null,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.coupon) {
        setCoupons((prev) => [result.coupon!, ...prev]);
      }

      setSuccess(`Cupón ${result.coupon?.code} creado correctamente.`);
      event.currentTarget.reset();
      setRewardType("percent_discount");
    });
  }

  function handleCreateCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createSubscriptionCampaign({
        name: String(form.get("name") ?? ""),
        discountPercent: form.get("discountPercent")
          ? Number(form.get("discountPercent"))
          : null,
        discountUsd: form.get("discountUsd")
          ? Number(form.get("discountUsd"))
          : null,
        startsAt: String(form.get("startsAt") ?? ""),
        endsAt: String(form.get("endsAt") ?? ""),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.campaign) {
        setCampaigns((prev) => [result.campaign!, ...prev]);
      }

      setSuccess(`Oferta «${result.campaign?.name}» creada correctamente.`);
      event.currentTarget.reset();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-teal-200/80 bg-teal-50/50 px-4 py-3 text-sm text-teal-900 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-100">
        Los usuarios siguen canjeando cupones en{" "}
        <strong>Planes y facturación</strong> del dashboard. Desde aquí defines
        los códigos y ofertas que estarán disponibles para ellos.
      </div>

      <div className="admin-subnav">
        {(
          [
            ["cupones", "Cupones con código"],
            ["ofertas", "Ofertas temporales"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              "admin-subnav-item",
              activeTab === id && "admin-subnav-item-active",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          {success}
        </p>
      ) : null}

      {activeTab === "cupones" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Cupones activos
              </p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {activeCoupons.length}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Total creados
              </p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {coupons.length}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Canjes registrados
              </p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {coupons.reduce(
                  (sum, coupon) => sum + (coupon.redemption_count ?? 0),
                  0,
                )}
              </p>
            </div>
          </div>

          <form
            onSubmit={handleCreateCoupon}
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Crear cupón personalizado
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Define el código, el beneficio y opcionalmente un límite de usos
                o fecha de expiración.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="coupon-code">Código</Label>
                <Input
                  id="coupon-code"
                  name="code"
                  required
                  className="mt-1.5 uppercase"
                  placeholder="NAVIDAD2026"
                />
              </div>
              <div>
                <Label htmlFor="coupon-name">Nombre interno</Label>
                <Input
                  id="coupon-name"
                  name="name"
                  required
                  className="mt-1.5"
                  placeholder="Promo Navidad 2026"
                />
              </div>
              <div>
                <Label htmlFor="coupon-reward-type">Tipo de beneficio</Label>
                <select
                  id="coupon-reward-type"
                  name="rewardType"
                  value={rewardType}
                  onChange={(event) =>
                    setRewardType(
                      event.target.value as SubscriptionCouponRewardType,
                    )
                  }
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="percent_discount">
                    Descuento porcentual
                  </option>
                  <option value="fixed_discount">Descuento fijo (USD)</option>
                  <option value="grant_pro_days">Días Pro gratis</option>
                </select>
              </div>
              <div>
                <Label htmlFor="coupon-discount-value">{discountValueLabel}</Label>
                <Input
                  id="coupon-discount-value"
                  name="discountValue"
                  type="number"
                  min={rewardType === "fixed_discount" ? 0.01 : 1}
                  max={rewardType === "percent_discount" ? 100 : undefined}
                  step={rewardType === "fixed_discount" ? "0.01" : "1"}
                  required
                  className="mt-1.5"
                  placeholder={
                    rewardType === "percent_discount"
                      ? "20"
                      : rewardType === "fixed_discount"
                        ? "5"
                        : "30"
                  }
                />
              </div>
              <div>
                <Label htmlFor="coupon-ends-at">Fecha de expiración</Label>
                <Input
                  id="coupon-ends-at"
                  name="endsAt"
                  type="datetime-local"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="coupon-max-redemptions">
                  Límite de usos (opcional)
                </Label>
                <Input
                  id="coupon-max-redemptions"
                  name="maxRedemptions"
                  type="number"
                  min={1}
                  className="mt-1.5"
                  placeholder="Ej. 100"
                />
              </div>
            </div>
            <Button type="submit" disabled={pending}>
              Crear cupón
            </Button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2">Código</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Beneficio</th>
                  <th className="px-3 py-2">Expira</th>
                  <th className="px-3 py-2">Usos</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const expired = isSubscriptionCouponExpired(coupon);
                  const statusLabel = !coupon.is_active
                    ? "Inactivo"
                    : expired
                      ? "Expirado"
                      : "Activo";

                  return (
                    <tr
                      key={coupon.id}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="px-3 py-2 font-semibold">{coupon.code}</td>
                      <td className="px-3 py-2">{coupon.name}</td>
                      <td className="px-3 py-2">
                        {formatSubscriptionCouponReward(coupon)}
                      </td>
                      <td className="px-3 py-2">
                        {formatAdminPromoDate(coupon.ends_at)}
                      </td>
                      <td className="px-3 py-2">
                        {coupon.redemption_count}
                        {coupon.max_redemptions != null
                          ? ` / ${coupon.max_redemptions}`
                          : ""}
                      </td>
                      <td className="px-3 py-2">{statusLabel}</td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await toggleSubscriptionCoupon(
                                coupon.id,
                                !coupon.is_active,
                              );
                              if (result.error) {
                                setError(result.error);
                                return;
                              }
                              setCoupons((prev) =>
                                prev.map((row) =>
                                  row.id === coupon.id
                                    ? { ...row, is_active: !row.is_active }
                                    : row,
                                ),
                              );
                              setSuccess(
                                coupon.is_active
                                  ? `Cupón ${coupon.code} desactivado.`
                                  : `Cupón ${coupon.code} activado.`,
                              );
                            })
                          }
                        >
                          {coupon.is_active ? "Desactivar" : "Activar"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {coupons.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-zinc-500"
                    >
                      Aún no hay cupones. Crea el primero arriba.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === "ofertas" ? (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateCampaign}
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Crear oferta temporal automática
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Descuento aplicado automáticamente en checkout durante el
                periodo indicado (sin código).
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="campaign-name">Nombre de la oferta</Label>
                <Input
                  id="campaign-name"
                  name="name"
                  required
                  className="mt-1.5"
                  placeholder="Oferta de Julio"
                />
              </div>
              <div>
                <Label htmlFor="campaign-percent">Descuento %</Label>
                <Input
                  id="campaign-percent"
                  name="discountPercent"
                  type="number"
                  min={1}
                  max={100}
                  className="mt-1.5"
                  placeholder="15"
                />
              </div>
              <div>
                <Label htmlFor="campaign-usd">Descuento USD</Label>
                <Input
                  id="campaign-usd"
                  name="discountUsd"
                  type="number"
                  min={0.01}
                  step="0.01"
                  className="mt-1.5"
                  placeholder="5.00"
                />
              </div>
              <div>
                <Label htmlFor="campaign-starts-at">Inicio</Label>
                <Input
                  id="campaign-starts-at"
                  name="startsAt"
                  type="datetime-local"
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="campaign-ends-at">Fin</Label>
                <Input
                  id="campaign-ends-at"
                  name="endsAt"
                  type="datetime-local"
                  required
                  className="mt-1.5"
                />
              </div>
            </div>
            <Button type="submit" disabled={pending}>
              Crear oferta
            </Button>
          </form>

          <ul className="space-y-2">
            {campaigns.map((campaign) => (
              <li
                key={campaign.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {campaign.name}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatSubscriptionCampaignReward(campaign)} ·{" "}
                    {formatAdminPromoDate(campaign.starts_at)} →{" "}
                    {formatAdminPromoDate(campaign.ends_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">
                    {campaign.is_active ? "Activa" : "Inactiva"}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await toggleSubscriptionCampaign(
                          campaign.id,
                          !campaign.is_active,
                        );
                        if (result.error) {
                          setError(result.error);
                          return;
                        }
                        setCampaigns((prev) =>
                          prev.map((row) =>
                            row.id === campaign.id
                              ? { ...row, is_active: !row.is_active }
                              : row,
                          ),
                        );
                      })
                    }
                  >
                    {campaign.is_active ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </li>
            ))}
            {campaigns.length === 0 ? (
              <li className="rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
                No hay ofertas temporales creadas.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
