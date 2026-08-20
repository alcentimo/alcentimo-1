"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { AdminSupplierDirectoryRow } from "@/lib/admin/get-admin-suppliers";
import { supplierCategoryLabel } from "@/lib/supplier/categories";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type SuppliersQuickFilter =
  | "all"
  | "catalog_on"
  | "catalog_off"
  | "with_products"
  | "without_products"
  | "status_active"
  | "status_pending"
  | "status_suspended";

const PAGE_SIZES = [10, 25, 50] as const;

const QUICK_FILTERS: Array<{ id: SuppliersQuickFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "catalog_on", label: "Catálogo publicado" },
  { id: "catalog_off", label: "Catálogo oculto" },
  { id: "with_products", label: "Con productos" },
  { id: "without_products", label: "Sin productos" },
  { id: "status_active", label: "Activos" },
  { id: "status_pending", label: "Pendientes" },
  { id: "status_suspended", label: "Suspendidos" },
];

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

function formatRegistrationDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatPhoneDisplay(phone: string): string {
  if (!phone) return "—";
  if (phone.startsWith("58") && phone.length >= 12) {
    return `+${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5)}`;
  }
  return phone.startsWith("+") ? phone : phone;
}

function statusLabel(status: AdminSupplierDirectoryRow["status"]): string {
  if (status === "pending") return "Pendiente";
  if (status === "suspended") return "Suspendido";
  return "Activo";
}

interface AdminSuppliersDirectoryPanelProps {
  initialSuppliers: AdminSupplierDirectoryRow[];
}

export function AdminSuppliersDirectoryPanel({
  initialSuppliers,
}: AdminSuppliersDirectoryPanelProps) {
  const [suppliers] = useState(initialSuppliers);
  const [quickFilter, setQuickFilter] = useState<SuppliersQuickFilter>("all");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] =
    useState<(typeof PAGE_SIZES)[number]>(25);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((row) => {
      if (quickFilter === "catalog_on" && !row.catalogVisible) return false;
      if (quickFilter === "catalog_off" && row.catalogVisible) return false;
      if (quickFilter === "with_products" && row.activeProductCount <= 0) {
        return false;
      }
      if (quickFilter === "without_products" && row.activeProductCount > 0) {
        return false;
      }
      if (quickFilter === "status_active" && row.status !== "active") {
        return false;
      }
      if (quickFilter === "status_pending" && row.status !== "pending") {
        return false;
      }
      if (quickFilter === "status_suspended" && row.status !== "suspended") {
        return false;
      }
      if (q) {
        const hay = [
          row.companyName,
          row.contactName,
          row.email,
          row.phone,
          row.userId,
          supplierCategoryLabel(row.category),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [suppliers, quickFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paged = filtered.slice(pageStart, pageStart + pageSize);
  const pageItems = buildPageItems(safePage, totalPages);
  const rangeFrom = filtered.length === 0 ? 0 : pageStart + 1;
  const rangeTo = Math.min(pageStart + pageSize, filtered.length);

  function selectQuickFilter(id: SuppliersQuickFilter) {
    setQuickFilter(id);
    setPage(1);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updatePageSize(size: (typeof PAGE_SIZES)[number]) {
    setPageSize(size);
    setPage(1);
  }

  return (
    <div className="admin-stores-panel space-y-4">
      <div className="admin-stores-toolbar">
        <div className="admin-stores-search">
          <Search className="admin-stores-search-icon" aria-hidden="true" />
          <Input
            id="admin-suppliers-search"
            className="admin-stores-search-input"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Buscar por empresa, contacto, correo o teléfono…"
            aria-label="Buscar proveedores"
          />
        </div>
        <div
          className="admin-stores-quick-filters"
          role="group"
          aria-label="Filtros de proveedores"
        >
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => selectQuickFilter(filter.id)}
              className={cn(
                "admin-stores-chip",
                quickFilter === filter.id && "admin-stores-chip-active",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <p className="admin-stores-result-count">
          {filtered.length.toLocaleString("es-VE")} resultado
          {filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="admin-stores-table-shell">
        <div className="admin-stores-table-scroll">
          <table className="admin-stores-table">
            <thead>
              <tr>
                <th className="admin-stores-th">Empresa</th>
                <th className="admin-stores-th">Contacto</th>
                <th className="admin-stores-th">Correo</th>
                <th className="admin-stores-th">Teléfono</th>
                <th className="admin-stores-th">Registro</th>
                <th className="admin-stores-th admin-stores-th-num">
                  Productos activos
                </th>
                <th className="admin-stores-th">Catálogo</th>
                <th className="admin-stores-th">Estado</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => (
                <tr key={row.userId} className="admin-stores-row">
                  <td className="admin-stores-td">
                    <div className="admin-stores-store-name">
                      {row.companyName}
                    </div>
                    <div className="admin-stores-store-slug">
                      {supplierCategoryLabel(row.category)}
                    </div>
                  </td>
                  <td className="admin-stores-td">{row.contactName}</td>
                  <td className="admin-stores-td">
                    <span
                      className="admin-stores-email"
                      title={row.email || undefined}
                    >
                      {row.email || "Sin email"}
                    </span>
                  </td>
                  <td className="admin-stores-td">
                    {row.whatsappUrl ? (
                      <a
                        href={row.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-stores-link"
                      >
                        {formatPhoneDisplay(row.phone)}
                      </a>
                    ) : row.phone ? (
                      <span className="admin-stores-td-muted">{row.phone}</span>
                    ) : (
                      <span className="admin-stores-empty">—</span>
                    )}
                  </td>
                  <td className="admin-stores-td admin-stores-td-muted whitespace-nowrap">
                    {formatRegistrationDate(row.createdAt)}
                  </td>
                  <td className="admin-stores-td admin-stores-td-num">
                    <div>{row.activeProductCount.toLocaleString("es-VE")}</div>
                    {row.publishedProductCount > 0 ? (
                      <div className="admin-stores-plan-meta">
                        {row.publishedProductCount.toLocaleString("es-VE")} a la
                        venta
                      </div>
                    ) : null}
                  </td>
                  <td className="admin-stores-td">
                    <span
                      className={cn(
                        "admin-stores-plan-name",
                        row.catalogVisible
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-zinc-500",
                      )}
                    >
                      {row.catalogVisible ? "Publicado" : "Oculto"}
                    </span>
                  </td>
                  <td className="admin-stores-td">
                    <div className="admin-stores-plan-name">
                      {statusLabel(row.status)}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-stores-empty-state">
                    No hay proveedores con ese filtro.
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
                updatePageSize(
                  Number(event.target.value) as (typeof PAGE_SIZES)[number],
                )
              }
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <p className="admin-stores-page-range">
            {rangeFrom}–{rangeTo} de {filtered.length.toLocaleString("es-VE")}
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
  );
}
