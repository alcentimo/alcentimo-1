"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { AdminUserRow } from "@/lib/admin/get-admin-users";
import { formatPlanName } from "@/src/config/plans";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import {
  DIRECTORY_PAGE_SIZE,
  buildPageItems,
  formatDirectoryDate,
  formatDirectoryPhone,
  matchesDirectorySearch,
} from "@/components/admin/admin-directory";

function dropshipperStatus(user: AdminUserRow): string {
  if (user.subscriptionStatus === "provisional") return "Prueba";
  if (user.subscriptionStatus === "active") {
    return formatPlanName(user.plan);
  }
  if (!user.storeId) return "Sin tienda";
  return formatPlanName(user.plan);
}

interface AdminDropshippersDirectoryPanelProps {
  initialUsers: AdminUserRow[];
}

export function AdminDropshippersDirectoryPanel({
  initialUsers,
}: AdminDropshippersDirectoryPanelProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return initialUsers.filter((row) =>
      matchesDirectorySearch(search, [row.storeName, row.email]),
    );
  }, [initialUsers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / DIRECTORY_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * DIRECTORY_PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + DIRECTORY_PAGE_SIZE);
  const pageItems = buildPageItems(safePage, totalPages);

  return (
    <div className="admin-stores-panel space-y-4">
      <div className="admin-stores-search">
        <Search className="admin-stores-search-icon" aria-hidden="true" />
        <Input
          id="admin-dropshippers-search"
          className="admin-stores-search-input"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nombre o correo…"
          aria-label="Buscar dropshippers"
        />
      </div>

      <div className="admin-stores-table-shell">
        <div className="admin-stores-table-scroll">
          <table className="admin-stores-table">
            <thead>
              <tr>
                <th className="admin-stores-th">Nombre / Tienda</th>
                <th className="admin-stores-th">Correo</th>
                <th className="admin-stores-th">Teléfono</th>
                <th className="admin-stores-th">Registro</th>
                <th className="admin-stores-th">Estado</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => (
                <tr key={row.rowKey} className="admin-stores-row">
                  <td className="admin-stores-td">
                    <div className="admin-stores-store-name">{row.storeName}</div>
                  </td>
                  <td className="admin-stores-td">
                    <span
                      className="admin-stores-email"
                      title={row.email ?? undefined}
                    >
                      {row.email ?? "—"}
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
                        {formatDirectoryPhone(row.whatsappPhone)}
                      </a>
                    ) : (
                      <span className="admin-stores-td-muted">
                        {formatDirectoryPhone(row.whatsappPhone)}
                      </span>
                    )}
                  </td>
                  <td className="admin-stores-td admin-stores-td-muted whitespace-nowrap">
                    {formatDirectoryDate(row.createdAt)}
                  </td>
                  <td className="admin-stores-td">
                    <span className="admin-stores-plan-name">
                      {dropshipperStatus(row)}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="admin-stores-empty-state">
                    No hay dropshippers con esa búsqueda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {filtered.length > DIRECTORY_PAGE_SIZE ? (
          <div className="admin-stores-pagination">
            <p className="admin-stores-page-range">
              {filtered.length.toLocaleString("es-VE")} dropshippers
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
        ) : null}
      </div>
    </div>
  );
}
