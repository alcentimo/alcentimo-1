"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import type { AdminUserRow } from "@/lib/admin/get-admin-users";
import type { GrowthAuditEntry } from "@/lib/admin/growth-audit";
import type {
  SubscriptionCampaign,
  SubscriptionCoupon,
  SubscriptionCouponRewardType,
} from "@/lib/database.types";
import {
  grantProMonthToUser,
  grantProMonthToUsers,
  grantOrExtendProTrialToUser,
  grantOrExtendProTrialToUsers,
  closeProTrialToFreePlan,
  closeProTrialToFreePlanForUsers,
  sendPromoOffersToUsers,
} from "@/lib/admin/grant-pro-actions";
import {
  createSubscriptionCampaign,
  createSubscriptionCoupon,
  toggleSubscriptionCampaign,
  toggleSubscriptionCoupon,
} from "@/lib/admin/subscription-promo-actions";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type GrowthSubTab = "usuarios" | "cupones" | "campanas" | "historial";

const ACTION_LABELS: Record<string, string> = {
  grant_pro: "Otorgar Pro",
  grant_pro_trial: "Prueba Pro",
  close_pro_trial: "Pasar a Gratis",
  create_coupon: "Crear cupón",
  toggle_coupon: "Cupón on/off",
  create_campaign: "Crear campaña",
  toggle_campaign: "Campaña on/off",
  send_promo: "Enviar promo",
};

function formatReward(coupon: SubscriptionCoupon): string {
  if (coupon.reward_type === "percent_discount") {
    return `${coupon.discount_percent}%`;
  }
  if (coupon.reward_type === "fixed_discount") {
    return `$${coupon.discount_usd}`;
  }
  return `${coupon.grant_pro_days} días Pro`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatPlanLabel(plan: string): string {
  switch (plan) {
    case "FREE":
      return "Gratis";
    case "PRO":
      return "Pro";
    case "BUSINESS":
      return "Business";
    case "ENTERPRISE":
      return "Enterprise";
    default:
      return plan;
  }
}

function formatSubscriptionStatus(status: string): string {
  switch (status) {
    case "active":
      return "Activa";
    case "provisional":
      return "Provisional";
    case "none":
      return "Sin suscripción";
    default:
      return status;
  }
}

function formatWhatsAppDisplay(phone: string | null): string {
  if (!phone) return "—";
  if (phone.startsWith("58") && phone.length >= 12) {
    return `+${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5)}`;
  }
  return `+${phone}`;
}

interface AdminGrowthPanelProps {
  initialUsers: AdminUserRow[];
  initialCoupons: SubscriptionCoupon[];
  initialCampaigns: SubscriptionCampaign[];
  initialAuditLog: GrowthAuditEntry[];
  initialPlanFilter?: "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE" | "all";
  initialMinProducts?: number;
  initialSubTab?: GrowthSubTab;
  /** Limita pestañas visibles dentro del módulo de crecimiento. */
  mode?: "full" | "usuarios" | "promociones";
}

export function AdminGrowthPanel({
  initialUsers,
  initialCoupons,
  initialCampaigns,
  initialAuditLog,
  initialPlanFilter = "all",
  initialMinProducts,
  initialSubTab = "usuarios",
  mode = "full",
}: AdminGrowthPanelProps) {
  const [subTab, setSubTab] = useState<GrowthSubTab>(
    mode === "promociones" ? "cupones" : initialSubTab,
  );
  const [users, setUsers] = useState(initialUsers);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [auditLog, setAuditLog] = useState(initialAuditLog);
  const [planFilter, setPlanFilter] = useState<
    "all" | "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE"
  >(initialPlanFilter);
  const [minProducts, setMinProducts] = useState(
    initialMinProducts != null ? String(initialMinProducts) : "",
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rewardType, setRewardType] =
    useState<SubscriptionCouponRewardType>("percent_discount");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [grantingTrialId, setGrantingTrialId] = useState<string | null>(null);
  const [closingFreeId, setClosingFreeId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const min = minProducts.trim() === "" ? null : Number(minProducts);
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (planFilter !== "all" && user.plan !== planFilter) return false;
      if (min != null && Number.isFinite(min) && user.productCount < min) {
        return false;
      }
      if (q) {
        const hay = [
          user.email ?? "",
          user.storeName,
          user.storeSlug ?? "",
          user.whatsappPhone ?? "",
          user.id,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, planFilter, minProducts, search]);

  function markUsersAsPro(ids: string[]) {
    const idSet = new Set(ids);
    setUsers((prev) =>
      prev.map((row) =>
        idSet.has(row.id)
          ? { ...row, plan: "PRO", subscriptionStatus: "active" }
          : row,
      ),
    );
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectFiltered() {
    setSelected(new Set(filteredUsers.map((u) => u.id)));
  }

  function handleGrant(userId: string) {
    setError(null);
    setSuccess(null);
    setGrantingId(userId);
    startTransition(async () => {
      const result = await grantProMonthToUser({ userId, days: 30 });
      setGrantingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      markUsersAsPro([userId]);
      setSuccess("Pro otorgado por 30 días.");
      setAuditLog((prev) => [
        {
          id: `local-${Date.now()}`,
          actorId: "me",
          actorEmail: "tú",
          action: "grant_pro",
          targetUserId: userId,
          targetEmail: users.find((u) => u.id === userId)?.email ?? null,
          summary: "Otorgó plan PRO por 30 días",
          meta: { days: 30 },
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    });
  }

  function handleGrantTrial(userId: string) {
    setError(null);
    setSuccess(null);
    setGrantingTrialId(userId);
    startTransition(async () => {
      const result = await grantOrExtendProTrialToUser({ userId, days: 30 });
      setGrantingTrialId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Prueba Pro activada/extendida por 30 días (sin anti-abuso).");
      setAuditLog((prev) => [
        {
          id: `local-${Date.now()}`,
          actorId: "me",
          actorEmail: "tú",
          action: "grant_pro_trial",
          targetUserId: userId,
          targetEmail: users.find((u) => u.id === userId)?.email ?? null,
          summary: "Activó/extendió prueba Pro por 30 días",
          meta: { days: 30, ends_at: result.endsAt ?? null },
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    });
  }

  function handleGrantSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      setError("Selecciona al menos un usuario.");
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await grantProMonthToUsers({ userIds: ids, days: 30 });
      if (result.error) {
        setError(result.error);
        return;
      }
      markUsersAsPro(ids);
      setSelected(new Set());
      setSuccess(
        `Pro otorgado a ${result.granted ?? ids.length} usuario(s)${
          result.failed ? ` (${result.failed} fallaron)` : ""
        }.`,
      );
    });
  }

  function handleGrantTrialSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      setError("Selecciona al menos un usuario.");
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await grantOrExtendProTrialToUsers({
        userIds: ids,
        days: 30,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      setSuccess(
        `Prueba Pro activada/extendida para ${result.granted ?? ids.length} usuario(s)${
          result.failed ? ` (${result.failed} fallaron)` : ""
        }.`,
      );
    });
  }

  function handleCloseToFree(userId: string) {
    setError(null);
    setSuccess(null);
    setClosingFreeId(userId);
    startTransition(async () => {
      const result = await closeProTrialToFreePlan({ userId });
      setClosingFreeId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setUsers((prev) =>
        prev.map((row) =>
          row.id === userId
            ? { ...row, plan: "FREE", subscriptionStatus: "none" }
            : row,
        ),
      );
      setSuccess("Cuenta pasada a Plan Gratis (cierre manual).");
      setAuditLog((prev) => [
        {
          id: `local-${Date.now()}`,
          actorId: "me",
          actorEmail: "tú",
          action: "close_pro_trial",
          targetUserId: userId,
          targetEmail: users.find((u) => u.id === userId)?.email ?? null,
          summary: "Pasó la cuenta a Plan Gratis",
          meta: {},
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    });
  }

  function handleCloseToFreeSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      setError("Selecciona al menos un usuario.");
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await closeProTrialToFreePlanForUsers({ userIds: ids });
      if (result.error) {
        setError(result.error);
        return;
      }
      setUsers((prev) =>
        prev.map((row) =>
          ids.includes(row.id)
            ? { ...row, plan: "FREE", subscriptionStatus: "none" }
            : row,
        ),
      );
      setSelected(new Set());
      setSuccess(
        `Pasados a Plan Gratis: ${result.granted ?? ids.length}${
          result.failed ? ` (${result.failed} fallaron)` : ""
        }.`,
      );
    });
  }

  function handleSendPromo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "");
    const message = String(form.get("message") ?? "");
    const couponId = String(form.get("couponId") ?? "") || null;
    const ids = Array.from(selected);
    if (ids.length === 0) {
      setError("Selecciona usuarios o usa «Seleccionar filtrados».");
      return;
    }

    startTransition(async () => {
      const result = await sendPromoOffersToUsers({
        userIds: ids,
        title,
        message,
        couponId,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(`Promoción enviada a ${result.sent ?? ids.length} usuarios.`);
      setSelected(new Set());
      event.currentTarget.reset();
    });
  }

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
      setSuccess(`Cupón ${result.coupon?.code} creado.`);
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
      setSuccess(`Campaña «${result.campaign?.name}» creada.`);
      event.currentTarget.reset();
    });
  }

  const discountValueLabel =
    rewardType === "percent_discount"
      ? "Porcentaje (%)"
      : rewardType === "fixed_discount"
        ? "Monto fijo (USD)"
        : "Días de Pro";

  const growthTabs =
    mode === "usuarios"
      ? ([["usuarios", "Usuarios"]] as const)
      : mode === "promociones"
        ? ([
            ["cupones", "Cupones"],
            ["campanas", "Campañas"],
            ["historial", "Historial"],
          ] as const)
        : ([
            ["usuarios", "Usuarios"],
            ["cupones", "Cupones"],
            ["campanas", "Campañas"],
            ["historial", "Historial"],
          ] as const);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {growthTabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium",
              subTab === id
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
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

      {subTab === "usuarios" ? (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-4">
            <div>
              <Label>Plan</Label>
              <select
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={planFilter}
                onChange={(e) =>
                  setPlanFilter(e.target.value as typeof planFilter)
                }
              >
                <option value="all">Todos</option>
                <option value="FREE">Gratis</option>
                <option value="PRO">Pro</option>
                <option value="BUSINESS">Business</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
            <div>
              <Label>Mín. productos</Label>
              <Input
                className="mt-1.5"
                type="number"
                min={0}
                value={minProducts}
                onChange={(e) => setMinProducts(e.target.value)}
                placeholder="Ej. 9"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="admin-stores-search">
                Buscar por correo, tienda o teléfono
              </Label>
              <Input
                id="admin-stores-search"
                className="mt-1.5"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ej. maria@correo.com, Boutique Luna, 0412…"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={selectFiltered}>
              Seleccionar filtrados ({filteredUsers.length})
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelected(new Set())}
            >
              Limpiar selección
            </Button>
            <Button
              type="button"
              disabled={pending || selected.size === 0}
              onClick={handleGrantSelected}
            >
              Otorgar Pro a seleccionados ({selected.size})
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || selected.size === 0}
              onClick={handleGrantTrialSelected}
            >
              Prueba Pro +30d a seleccionados ({selected.size})
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || selected.size === 0}
              onClick={handleCloseToFreeSelected}
            >
              Pasar a Gratis ({selected.size})
            </Button>
          </div>

          <form
            onSubmit={handleSendPromo}
            className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/40 dark:bg-teal-950/20"
          >
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Enviar promoción a estos usuarios
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="promo-title">Título</Label>
                <Input
                  id="promo-title"
                  name="title"
                  required
                  className="mt-1.5"
                  placeholder="Oferta especial para ti"
                />
              </div>
              <div>
                <Label htmlFor="promo-coupon">Cupón (opcional)</Label>
                <select
                  id="promo-coupon"
                  name="couponId"
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="">Sin cupón vinculado</option>
                  {coupons
                    .filter((c) => c.is_active)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="promo-message">Mensaje</Label>
              <textarea
                id="promo-message"
                name="message"
                required
                rows={3}
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="Usa el código NAVIDAD2026..."
              />
            </div>
            <Button type="submit" disabled={pending || selected.size === 0}>
              Enviar promoción a estos usuarios
            </Button>
          </form>

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filteredUsers.length} tienda
            {filteredUsers.length === 1 ? "" : "s"} / cliente
            {filteredUsers.length === 1 ? "" : "s"}
          </p>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900">
                <tr>
                  <th className="px-3 py-2.5" />
                  <th className="px-3 py-2.5">Tienda</th>
                  <th className="px-3 py-2.5">Correo</th>
                  <th className="px-3 py-2.5">WhatsApp</th>
                  <th className="px-3 py-2.5">Catálogo</th>
                  <th className="px-3 py-2.5">Visitas</th>
                  <th className="px-3 py-2.5">Plan / estado</th>
                  <th className="px-3 py-2.5">Productos</th>
                  <th className="px-3 py-2.5">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.rowKey}
                    className="border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2.5 align-top">
                      <input
                        type="checkbox"
                        checked={selected.has(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        aria-label={`Seleccionar ${user.email ?? user.storeName}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        {user.storeName}
                      </div>
                      {user.storeSlug ? (
                        <div className="text-xs text-zinc-400">
                          /{user.storeSlug}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="break-all text-zinc-800 dark:text-zinc-200">
                        {user.email ?? "Sin email"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {user.whatsappUrl ? (
                        <a
                          href={user.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          {formatWhatsAppDisplay(user.whatsappPhone)}
                        </a>
                      ) : user.whatsappPhone ? (
                        <span className="text-zinc-600 dark:text-zinc-300">
                          {user.whatsappPhone}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {user.catalogUrl ? (
                        <a
                          href={user.catalogUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-teal-700 hover:underline dark:text-teal-400"
                        >
                          Abrir catálogo
                        </a>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top tabular-nums">
                      {user.storeId ? (
                        <span className="font-medium text-zinc-900 dark:text-zinc-50">
                          {(user.catalogVisitsTotal ?? 0).toLocaleString("es-VE")}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">
                        {formatPlanLabel(user.plan)}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {formatSubscriptionStatus(user.subscriptionStatus)}
                      </div>
                      {user.periodEndsAt ? (
                        <div className="mt-0.5 text-[11px] text-zinc-400">
                          Hasta {formatDate(user.periodEndsAt)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 align-top tabular-nums">
                      {user.productCount}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          disabled={pending && grantingId === user.id}
                          onClick={() => handleGrant(user.id)}
                        >
                          {grantingId === user.id ? "Otorgando…" : "Otorgar Pro"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending && grantingTrialId === user.id}
                          onClick={() => handleGrantTrial(user.id)}
                          title="Activa o extiende la prueba Pro gratis sin validación anti-abuso"
                        >
                          {grantingTrialId === user.id
                            ? "Activando…"
                            : "Prueba +30d"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={pending && closingFreeId === user.id}
                          onClick={() => handleCloseToFree(user.id)}
                          title="Cierra la prueba/prórroga y aplica Plan Gratis (solo admin)"
                        >
                          {closingFreeId === user.id
                            ? "Cerrando…"
                            : "→ Gratis"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-3 py-8 text-center text-zinc-500"
                    >
                      No hay tiendas o usuarios con ese filtro.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {subTab === "cupones" ? (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateCoupon}
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-sm font-semibold">Crear nuevo cupón</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Código</Label>
                <Input
                  name="code"
                  required
                  className="mt-1.5"
                  placeholder="NAVIDAD2026"
                />
              </div>
              <div>
                <Label>Nombre</Label>
                <Input
                  name="name"
                  required
                  className="mt-1.5"
                  placeholder="Promo Navidad"
                />
              </div>
              <div>
                <Label>Tipo de descuento</Label>
                <select
                  name="rewardType"
                  value={rewardType}
                  onChange={(e) =>
                    setRewardType(
                      e.target.value as SubscriptionCouponRewardType,
                    )
                  }
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="percent_discount">Descuento %</option>
                  <option value="fixed_discount">Descuento fijo USD</option>
                  <option value="grant_pro_days">Regalar días Pro</option>
                </select>
              </div>
              <div>
                <Label>{discountValueLabel}</Label>
                <Input
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
                <Label>Fecha de expiración</Label>
                <Input name="endsAt" type="datetime-local" className="mt-1.5" />
              </div>
              <div>
                <Label>Máx. usos (opcional)</Label>
                <Input
                  name="maxRedemptions"
                  type="number"
                  min={1}
                  className="mt-1.5"
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
                {coupons.map((coupon) => (
                  <tr
                    key={coupon.id}
                    className="border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2 font-semibold">{coupon.code}</td>
                    <td className="px-3 py-2">{coupon.name}</td>
                    <td className="px-3 py-2">{formatReward(coupon)}</td>
                    <td className="px-3 py-2">{formatDate(coupon.ends_at)}</td>
                    <td className="px-3 py-2">
                      {coupon.redemption_count}
                      {coupon.max_redemptions != null
                        ? ` / ${coupon.max_redemptions}`
                        : ""}
                    </td>
                    <td className="px-3 py-2">
                      {coupon.is_active ? "Activo" : "Inactivo"}
                    </td>
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
                          })
                        }
                      >
                        {coupon.is_active ? "Desactivar" : "Activar"}
                      </Button>
                    </td>
                  </tr>
                ))}
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

      {subTab === "campanas" ? (
        <div className="space-y-4">
          <form
            onSubmit={handleCreateCampaign}
            className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-sm font-semibold">Nueva campaña temporal</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Nombre</Label>
                <Input
                  name="name"
                  required
                  className="mt-1.5"
                  placeholder="Oferta de Julio"
                />
              </div>
              <div>
                <Label>% descuento</Label>
                <Input
                  name="discountPercent"
                  type="number"
                  min={1}
                  max={100}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>$ descuento</Label>
                <Input
                  name="discountUsd"
                  type="number"
                  min={0.01}
                  step="0.01"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Inicio</Label>
                <Input
                  name="startsAt"
                  type="datetime-local"
                  required
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Fin</Label>
                <Input
                  name="endsAt"
                  type="datetime-local"
                  required
                  className="mt-1.5"
                />
              </div>
            </div>
            <Button type="submit" disabled={pending}>
              Crear campaña
            </Button>
          </form>

          <ul className="space-y-2">
            {campaigns.map((campaign) => (
              <li
                key={campaign.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {campaign.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {campaign.discount_percent != null
                      ? `-${campaign.discount_percent}%`
                      : ""}
                    {campaign.discount_usd != null
                      ? ` -$${campaign.discount_usd}`
                      : ""}{" "}
                    · {formatDate(campaign.starts_at)} →{" "}
                    {formatDate(campaign.ends_at)}
                  </p>
                </div>
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
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {subTab === "historial" ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2">Cuándo</th>
                <th className="px-3 py-2">Quién</th>
                <th className="px-3 py-2">Acción</th>
                <th className="px-3 py-2">Detalle</th>
                <th className="px-3 py-2">Usuario afectado</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-t border-zinc-100 dark:border-zinc-800"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatDate(entry.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    {entry.actorEmail ?? entry.actorId}
                  </td>
                  <td className="px-3 py-2">
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </td>
                  <td className="px-3 py-2">{entry.summary}</td>
                  <td className="px-3 py-2">
                    {entry.targetEmail ?? entry.targetUserId ?? "—"}
                  </td>
                </tr>
              ))}
              {auditLog.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-zinc-500"
                  >
                    Aún no hay acciones registradas en el historial.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
