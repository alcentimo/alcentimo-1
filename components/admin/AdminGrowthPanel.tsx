"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
} from "lucide-react";
import type { AdminUserRow } from "@/lib/admin/get-admin-users";
import type { GrowthAuditEntry } from "@/lib/admin/growth-audit";
import {
  grantProMonthToUser,
  grantProMonthToUsers,
  grantOrExtendProTrialToUser,
  grantOrExtendProTrialToUsers,
  closeProTrialToFreePlan,
  closeProTrialToFreePlanForUsers,
} from "@/lib/admin/grant-pro-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";
import { AdminCriticalConfirmDialog } from "@/components/admin/AdminCriticalConfirmDialog";
import { formatPlanName } from "@/src/config/plans";

type GrowthSubTab = "usuarios" | "historial";

type UsersQuickFilter =
  | "all"
  | "with_store"
  | "without_store"
  | "plan_free"
  | "plan_pro"
  | "plan_business";

const USERS_PAGE_SIZES = [10, 25, 50] as const;

const USERS_QUICK_FILTERS: Array<{ id: UsersQuickFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "with_store", label: "Con tienda" },
  { id: "without_store", label: "Sin tienda" },
  { id: "plan_free", label: "Plan Gratis" },
  { id: "plan_pro", label: "Plan Profesional" },
  { id: "plan_business", label: "Plan Comercial" },
];

function resolveInitialQuickFilter(
  plan?: "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE" | "all",
): UsersQuickFilter {
  if (plan === "FREE") return "plan_free";
  if (plan === "PRO") return "plan_pro";
  if (plan === "BUSINESS") return "plan_business";
  return "all";
}

function buildPageItems(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, total, current]);
  for (let offset = -1; offset <= 1; offset += 1) {
    const page = current + offset;
    if (page > 1 && page < total) pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index]!;
    const prev = sorted[index - 1];
    if (prev != null && page - prev > 1) items.push("ellipsis");
    items.push(page);
  }
  return items;
}

type CriticalPlanAction =
  | {
      kind: "grant" | "grant_trial" | "close_free";
      userId: string;
    }
  | {
      kind: "grant_selected" | "grant_trial_selected" | "close_free_selected";
    };

const ACTION_LABELS: Record<string, string> = {
  grant_pro: "Otorgar Profesional",
  grant_pro_trial: "Prueba Profesional",
  close_pro_trial: "Pasar a Gratis",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** Día de registro para la columna Registro. */
function formatRegistrationDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

type UsersTableSortKey = "visits" | "registro";
type UsersTableSortDirection = "desc" | "asc" | "none";

type UsersTableSort = {
  key: UsersTableSortKey | null;
  direction: UsersTableSortDirection;
};

const DEFAULT_USERS_TABLE_SORT: UsersTableSort = {
  key: null,
  direction: "none",
};

function cycleUsersTableSort(
  prev: UsersTableSort,
  key: UsersTableSortKey,
): UsersTableSort {
  // Ciclo: default → descendente → ascendente → default.
  if (prev.key !== key || prev.direction === "none") {
    return { key, direction: "desc" };
  }
  if (prev.direction === "desc") {
    return { key, direction: "asc" };
  }
  return DEFAULT_USERS_TABLE_SORT;
}

function registrationTimestamp(iso: string | null | undefined): number {
  if (!iso) return Number.NaN;
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : Number.NaN;
}

function UsersSortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: UsersTableSortDirection;
}) {
  if (!active || direction === "none") {
    return (
      <ArrowUpDown
        className="admin-stores-sort-icon admin-stores-sort-icon-idle"
        aria-hidden="true"
      />
    );
  }
  if (direction === "desc") {
    return (
      <ArrowDown
        className="admin-stores-sort-icon admin-stores-sort-icon-active"
        aria-hidden="true"
      />
    );
  }
  return (
    <ArrowUp
      className="admin-stores-sort-icon admin-stores-sort-icon-active"
      aria-hidden="true"
    />
  );
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
  initialAuditLog: GrowthAuditEntry[];
  initialPlanFilter?: "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE" | "all";
  initialMinProducts?: number;
  initialSubTab?: GrowthSubTab;
}

export function AdminGrowthPanel({
  initialUsers,
  initialAuditLog,
  initialPlanFilter = "all",
  initialMinProducts,
  initialSubTab = "usuarios",
}: AdminGrowthPanelProps) {
  const [subTab, setSubTab] = useState<GrowthSubTab>(initialSubTab);
  const [users, setUsers] = useState(initialUsers);
  const [auditLog, setAuditLog] = useState(initialAuditLog);
  const [quickFilter, setQuickFilter] = useState<UsersQuickFilter>(() =>
    resolveInitialQuickFilter(initialPlanFilter),
  );
  const [minProducts, setMinProducts] = useState(
    initialMinProducts != null ? String(initialMinProducts) : "",
  );
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] =
    useState<(typeof USERS_PAGE_SIZES)[number]>(25);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [grantingTrialId, setGrantingTrialId] = useState<string | null>(null);
  const [closingFreeId, setClosingFreeId] = useState<string | null>(null);
  const [tableSort, setTableSort] = useState<UsersTableSort>(
    DEFAULT_USERS_TABLE_SORT,
  );
  const [criticalAction, setCriticalAction] =
    useState<CriticalPlanAction | null>(null);

  function toggleTableSort(key: UsersTableSortKey) {
    setTableSort((prev) => cycleUsersTableSort(prev, key));
  }

  const filteredUsers = useMemo(() => {
    const min = minProducts.trim() === "" ? null : Number(minProducts);
    const q = search.trim().toLowerCase();
    const filtered = users.filter((user) => {
      if (quickFilter === "with_store" && !user.storeId) return false;
      if (quickFilter === "without_store" && user.storeId) return false;
      if (quickFilter === "plan_free" && user.plan !== "FREE") return false;
      if (quickFilter === "plan_pro" && user.plan !== "PRO") return false;
      if (quickFilter === "plan_business" && user.plan !== "BUSINESS") {
        return false;
      }
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

    return [...filtered].sort((a, b) => {
      // Estado por defecto: sin orden de columna (solo nombre estable).
      if (tableSort.direction === "none" || tableSort.key == null) {
        return a.storeName.localeCompare(b.storeName, "es");
      }

      const descending = tableSort.direction === "desc";

      if (tableSort.key === "registro") {
        const aTime = registrationTimestamp(a.createdAt);
        const bTime = registrationTimestamp(b.createdAt);
        const aValid = Number.isFinite(aTime);
        const bValid = Number.isFinite(bTime);
        if (aValid && bValid) {
          const cmp = descending ? bTime - aTime : aTime - bTime;
          if (cmp !== 0) return cmp;
        } else if (aValid !== bValid) {
          // Sin fecha al final.
          return aValid ? -1 : 1;
        }
        return a.storeName.localeCompare(b.storeName, "es");
      }

      const aVisits = a.catalogVisitsMonth ?? 0;
      const bVisits = b.catalogVisitsMonth ?? 0;
      const visitsCmp = descending ? bVisits - aVisits : aVisits - bVisits;
      if (visitsCmp !== 0) return visitsCmp;
      return a.storeName.localeCompare(b.storeName, "es");
    });
  }, [users, quickFilter, minProducts, search, tableSort]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagedUsers = filteredUsers.slice(pageStart, pageStart + pageSize);
  const pageItems = buildPageItems(safePage, totalPages);
  const rangeFrom =
    filteredUsers.length === 0 ? 0 : pageStart + 1;
  const rangeTo = Math.min(pageStart + pageSize, filteredUsers.length);

  useEffect(() => {
    setPage(1);
  }, [quickFilter, minProducts, search, pageSize, tableSort]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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

  function resolveTargetLabel(userId: string): string {
    const user = users.find((row) => row.id === userId);
    if (!user) return "el usuario seleccionado";
    const store =
      user.storeName && user.storeName !== "Sin tienda"
        ? `«${user.storeName}»`
        : null;
    const email = user.email ?? "sin email";
    return store ? `la tienda ${store} (${email})` : `el usuario ${email}`;
  }

  function getCriticalConfirmCopy(action: CriticalPlanAction): {
    title: string;
    impact: string;
    confirmLabel: string;
    destructive: boolean;
  } {
    switch (action.kind) {
      case "grant":
        return {
          title: "Otorgar Plan Profesional",
          impact: `Vas a cambiar ${resolveTargetLabel(action.userId)} al plan Profesional por 30 días.`,
          confirmLabel: "Otorgar Profesional",
          destructive: false,
        };
      case "grant_trial":
        return {
          title: "Activar prueba Profesional",
          impact: `Vas a activar o extender la prueba Profesional (+30 días) para ${resolveTargetLabel(action.userId)}.`,
          confirmLabel: "Activar prueba",
          destructive: false,
        };
      case "close_free":
        return {
          title: "Pasar a Plan Gratis",
          impact: `Vas a cerrar la prueba/prórroga y dejar ${resolveTargetLabel(action.userId)} en Plan Gratis.`,
          confirmLabel: "Pasar a Gratis",
          destructive: true,
        };
      case "grant_selected":
        return {
          title: "Otorgar Profesional a seleccionados",
          impact: `Vas a otorgar Plan Profesional (30 días) a ${selected.size} usuario(s) seleccionado(s).`,
          confirmLabel: "Otorgar Profesional",
          destructive: false,
        };
      case "grant_trial_selected":
        return {
          title: "Prueba Profesional a seleccionados",
          impact: `Vas a activar/extender prueba Profesional (+30 días) a ${selected.size} usuario(s) seleccionado(s).`,
          confirmLabel: "Activar prueba",
          destructive: false,
        };
      case "close_free_selected":
        return {
          title: "Pasar seleccionados a Gratis",
          impact: `Vas a pasar a Plan Gratis a ${selected.size} usuario(s) seleccionado(s).`,
          confirmLabel: "Pasar a Gratis",
          destructive: true,
        };
    }
  }

  function executeGrant(userId: string) {
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
      setSuccess("Profesional otorgado por 30 días.");
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

  function executeGrantTrial(userId: string) {
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
      setSuccess("Prueba Profesional activada/extendida por 30 días (sin anti-abuso).");
      setAuditLog((prev) => [
        {
          id: `local-${Date.now()}`,
          actorId: "me",
          actorEmail: "tú",
          action: "grant_pro_trial",
          targetUserId: userId,
          targetEmail: users.find((u) => u.id === userId)?.email ?? null,
          summary: "Activó/extendió prueba Profesional por 30 días",
          meta: { days: 30, ends_at: result.endsAt ?? null },
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    });
  }

  function requestGrant(userId: string) {
    setCriticalAction({ kind: "grant", userId });
  }

  function requestGrantTrial(userId: string) {
    setCriticalAction({ kind: "grant_trial", userId });
  }

  function requestCloseToFree(userId: string) {
    setCriticalAction({ kind: "close_free", userId });
  }

  function requestGrantSelected() {
    if (selected.size === 0) {
      setError("Selecciona al menos un usuario.");
      return;
    }
    setCriticalAction({ kind: "grant_selected" });
  }

  function requestGrantTrialSelected() {
    if (selected.size === 0) {
      setError("Selecciona al menos un usuario.");
      return;
    }
    setCriticalAction({ kind: "grant_trial_selected" });
  }

  function requestCloseToFreeSelected() {
    if (selected.size === 0) {
      setError("Selecciona al menos un usuario.");
      return;
    }
    setCriticalAction({ kind: "close_free_selected" });
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
        `Profesional otorgado a ${result.granted ?? ids.length} usuario(s)${
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
        `Prueba Profesional activada/extendida para ${result.granted ?? ids.length} usuario(s)${
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

  function executeCriticalAction() {
    if (!criticalAction) return;
    const action = criticalAction;
    setCriticalAction(null);

    switch (action.kind) {
      case "grant":
        executeGrant(action.userId);
        break;
      case "grant_trial":
        executeGrantTrial(action.userId);
        break;
      case "close_free":
        handleCloseToFree(action.userId);
        break;
      case "grant_selected":
        handleGrantSelected();
        break;
      case "grant_trial_selected":
        handleGrantTrialSelected();
        break;
      case "close_free_selected":
        handleCloseToFreeSelected();
        break;
    }
  }

  const criticalConfirmCopy = criticalAction
    ? getCriticalConfirmCopy(criticalAction)
    : null;

  const growthTabs = [
    ["usuarios", "Usuarios"],
    ["historial", "Historial"],
  ] as const;

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
        <div className="admin-stores-panel space-y-4">
          <div className="admin-stores-toolbar">
            <div className="admin-stores-search">
              <Search
                className="admin-stores-search-icon"
                aria-hidden="true"
              />
              <Input
                id="admin-stores-search"
                className="admin-stores-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por tienda, correo, slug o teléfono…"
                aria-label="Buscar tiendas y usuarios"
              />
            </div>
            <div
              className="admin-stores-quick-filters"
              role="group"
              aria-label="Filtros rápidos"
            >
              {USERS_QUICK_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setQuickFilter(filter.id)}
                  className={cn(
                    "admin-stores-chip",
                    quickFilter === filter.id && "admin-stores-chip-active",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="admin-stores-toolbar-meta">
              <label className="admin-stores-min-products">
                <span>Mín. productos</span>
                <Input
                  type="number"
                  min={0}
                  value={minProducts}
                  onChange={(e) => setMinProducts(e.target.value)}
                  placeholder="0"
                  className="admin-stores-min-products-input"
                />
              </label>
              <p className="admin-stores-result-count">
                {filteredUsers.length.toLocaleString("es-VE")} resultado
                {filteredUsers.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectFiltered}
            >
              Seleccionar filtrados ({filteredUsers.length})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelected(new Set())}
            >
              Limpiar selección
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || selected.size === 0}
              onClick={requestGrantSelected}
            >
              Otorgar Profesional ({selected.size})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || selected.size === 0}
              onClick={requestGrantTrialSelected}
            >
              Prueba +30d ({selected.size})
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || selected.size === 0}
              onClick={requestCloseToFreeSelected}
            >
              Pasar a Gratis ({selected.size})
            </Button>
          </div>

          <div className="admin-stores-table-shell">
            <div className="admin-stores-table-scroll">
              <table className="admin-stores-table">
                <thead>
                  <tr>
                    <th className="admin-stores-th admin-stores-th-check" />
                    <th className="admin-stores-th">Tienda</th>
                    <th className="admin-stores-th">Correo</th>
                    <th
                      className="admin-stores-th"
                      aria-sort={
                        tableSort.key === "registro" &&
                        tableSort.direction === "desc"
                          ? "descending"
                          : tableSort.key === "registro" &&
                              tableSort.direction === "asc"
                            ? "ascending"
                            : "none"
                      }
                    >
                      <button
                        type="button"
                        className={cn(
                          "admin-stores-sort-btn",
                          tableSort.key === "registro" &&
                            tableSort.direction !== "none" &&
                            "admin-stores-sort-btn-active",
                        )}
                        onClick={() => toggleTableSort("registro")}
                        title={
                          tableSort.key === "registro" &&
                          tableSort.direction === "desc"
                            ? "Ordenado: más reciente primero (clic: más antiguo)"
                            : tableSort.key === "registro" &&
                                tableSort.direction === "asc"
                              ? "Ordenado: más antiguo primero (clic: sin orden)"
                              : "Ordenar por fecha de registro (más reciente primero)"
                        }
                      >
                        Registro
                        <UsersSortIcon
                          active={tableSort.key === "registro"}
                          direction={
                            tableSort.key === "registro"
                              ? tableSort.direction
                              : "none"
                          }
                        />
                      </button>
                    </th>
                    <th className="admin-stores-th">WhatsApp</th>
                    <th className="admin-stores-th">Catálogo</th>
                    <th
                      className="admin-stores-th admin-stores-th-num"
                      aria-sort={
                        tableSort.key === "visits" &&
                        tableSort.direction === "desc"
                          ? "descending"
                          : tableSort.key === "visits" &&
                              tableSort.direction === "asc"
                            ? "ascending"
                            : "none"
                      }
                    >
                      <button
                        type="button"
                        className={cn(
                          "admin-stores-sort-btn",
                          tableSort.key === "visits" &&
                            tableSort.direction !== "none" &&
                            "admin-stores-sort-btn-active",
                        )}
                        onClick={() => toggleTableSort("visits")}
                        title={
                          tableSort.key === "visits" &&
                          tableSort.direction === "desc"
                            ? "Ordenado: más visitas primero (clic: menos visitas)"
                            : tableSort.key === "visits" &&
                                tableSort.direction === "asc"
                              ? "Ordenado: menos visitas primero (clic: sin orden)"
                              : "Ordenar por visitas del mes (más visitas primero)"
                        }
                      >
                        Visitas
                        <UsersSortIcon
                          active={tableSort.key === "visits"}
                          direction={
                            tableSort.key === "visits"
                              ? tableSort.direction
                              : "none"
                          }
                        />
                      </button>
                    </th>
                    <th className="admin-stores-th">Plan</th>
                    <th className="admin-stores-th admin-stores-th-num">
                      Productos
                    </th>
                    <th className="admin-stores-th admin-stores-th-actions">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((user) => {
                    const rowBusy =
                      pending &&
                      (grantingId === user.id ||
                        grantingTrialId === user.id ||
                        closingFreeId === user.id);

                    return (
                      <tr key={user.rowKey} className="admin-stores-row">
                        <td className="admin-stores-td admin-stores-td-check">
                          <input
                            type="checkbox"
                            checked={selected.has(user.id)}
                            onChange={() => toggleSelect(user.id)}
                            aria-label={`Seleccionar ${user.email ?? user.storeName}`}
                          />
                        </td>
                        <td className="admin-stores-td">
                          <div className="admin-stores-store-name">
                            {user.storeName}
                          </div>
                          {user.storeSlug ? (
                            <div className="admin-stores-store-slug">
                              /{user.storeSlug}
                            </div>
                          ) : (
                            <div className="admin-stores-store-slug">
                              Sin slug
                            </div>
                          )}
                        </td>
                        <td className="admin-stores-td">
                          <span
                            className="admin-stores-email"
                            title={user.email ?? undefined}
                          >
                            {user.email ?? "Sin email"}
                          </span>
                        </td>
                        <td
                          className="admin-stores-td admin-stores-td-muted whitespace-nowrap"
                          title={
                            user.createdAt
                              ? formatDate(user.createdAt)
                              : "Sin fecha de registro"
                          }
                        >
                          {formatRegistrationDate(user.createdAt)}
                        </td>
                        <td className="admin-stores-td">
                          {user.whatsappUrl ? (
                            <a
                              href={user.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-stores-link"
                            >
                              {formatWhatsAppDisplay(user.whatsappPhone)}
                            </a>
                          ) : user.whatsappPhone ? (
                            <span className="admin-stores-td-muted">
                              {user.whatsappPhone}
                            </span>
                          ) : (
                            <span className="admin-stores-empty">—</span>
                          )}
                        </td>
                        <td className="admin-stores-td">
                          {user.catalogUrl ? (
                            <a
                              href={user.catalogUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-stores-link"
                            >
                              Abrir
                            </a>
                          ) : (
                            <span className="admin-stores-empty">—</span>
                          )}
                        </td>
                        <td className="admin-stores-td admin-stores-td-num">
                          {user.storeId ? (
                            (user.catalogVisitsMonth ?? 0).toLocaleString(
                              "es-VE",
                            )
                          ) : (
                            <span className="admin-stores-empty">—</span>
                          )}
                        </td>
                        <td className="admin-stores-td">
                          <div className="admin-stores-plan-name">
                            {formatPlanName(user.plan)}
                          </div>
                          <div className="admin-stores-plan-meta">
                            {formatSubscriptionStatus(user.subscriptionStatus)}
                            {user.periodEndsAt
                              ? ` · hasta ${formatRegistrationDate(user.periodEndsAt)}`
                              : ""}
                          </div>
                        </td>
                        <td className="admin-stores-td admin-stores-td-num">
                          {user.productCount.toLocaleString("es-VE")}
                        </td>
                        <td className="admin-stores-td admin-stores-td-actions">
                          <DropdownMenu
                            align="end"
                            className="inline-flex"
                            menuClassName="admin-stores-actions-menu"
                            trigger={
                              <button
                                type="button"
                                className="admin-stores-row-menu-trigger"
                                aria-label={`Acciones para ${user.storeName}`}
                                disabled={rowBusy}
                              >
                                <MoreHorizontal
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              </button>
                            }
                          >
                            {(close) => (
                              <>
                                <DropdownMenuItem
                                  disabled={pending && grantingId === user.id}
                                  onClick={() => {
                                    close();
                                    requestGrant(user.id);
                                  }}
                                >
                                  {grantingId === user.id
                                    ? "Otorgando…"
                                    : "Otorgar Profesional"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={
                                    pending && grantingTrialId === user.id
                                  }
                                  onClick={() => {
                                    close();
                                    requestGrantTrial(user.id);
                                  }}
                                >
                                  {grantingTrialId === user.id
                                    ? "Activando…"
                                    : "Prueba +30d"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  destructive
                                  disabled={
                                    pending && closingFreeId === user.id
                                  }
                                  onClick={() => {
                                    close();
                                    requestCloseToFree(user.id);
                                  }}
                                >
                                  {closingFreeId === user.id
                                    ? "Cerrando…"
                                    : "Pasar a Gratis"}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="admin-stores-empty-state">
                        No hay tiendas o usuarios con ese filtro.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="admin-stores-pagination">
              <label className="admin-stores-page-size">
                <span>Filas por página</span>
                <select
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(
                      Number(
                        event.target.value,
                      ) as (typeof USERS_PAGE_SIZES)[number],
                    )
                  }
                >
                  {USERS_PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

              <p className="admin-stores-page-range">
                {rangeFrom}–{rangeTo} de{" "}
                {filteredUsers.length.toLocaleString("es-VE")}
              </p>

              <div className="admin-stores-page-controls">
                <button
                  type="button"
                  className="admin-stores-page-btn"
                  disabled={safePage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                {pageItems.map((item, index) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="admin-stores-page-ellipsis"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={cn(
                        "admin-stores-page-btn",
                        item === safePage && "admin-stores-page-btn-active",
                      )}
                      onClick={() => setPage(item)}
                      aria-current={item === safePage ? "page" : undefined}
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  className="admin-stores-page-btn"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
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

      {criticalAction && criticalConfirmCopy ? (
        <AdminCriticalConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setCriticalAction(null);
          }}
          title={criticalConfirmCopy.title}
          impact={criticalConfirmCopy.impact}
          confirmLabel={criticalConfirmCopy.confirmLabel}
          destructive={criticalConfirmCopy.destructive}
          loading={pending}
          onConfirm={executeCriticalAction}
        />
      ) : null}
    </div>
  );
}
