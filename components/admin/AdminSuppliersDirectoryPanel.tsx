"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import type { AdminSupplierDirectoryRow } from "@/lib/admin/get-admin-suppliers";
import { setSupplierPublicCatalogEnabled } from "@/lib/admin/supplier-catalog-actions";
import { SettingsSwitch } from "@/components/ui/SettingsSwitch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import {
  DIRECTORY_PAGE_SIZE,
  buildPageItems,
  formatDirectoryPhone,
  matchesDirectorySearch,
} from "@/components/admin/admin-directory";

interface AdminSuppliersDirectoryPanelProps {
  initialSuppliers: AdminSupplierDirectoryRow[];
}

export function AdminSuppliersDirectoryPanel({
  initialSuppliers,
}: AdminSuppliersDirectoryPanelProps) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return suppliers.filter((row) =>
      matchesDirectorySearch(search, [
        row.companyName,
        row.contactName,
        row.email,
      ]),
    );
  }, [suppliers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / DIRECTORY_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * DIRECTORY_PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + DIRECTORY_PAGE_SIZE);
  const pageItems = buildPageItems(safePage, totalPages);

  async function handlePublicCatalogToggle(
    row: AdminSupplierDirectoryRow,
    enabled: boolean,
  ) {
    setBusyUserId(row.userId);
    setError(null);
    try {
      const result = await setSupplierPublicCatalogEnabled({
        supplierUserId: row.userId,
        enabled,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuppliers((current) =>
        current.map((item) =>
          item.userId === row.userId
            ? {
                ...item,
                showPublicCatalog: result.showPublicCatalog === true,
                publicCatalogSlug: result.publicCatalogSlug ?? item.publicCatalogSlug,
              }
            : item,
        ),
      );
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="admin-stores-panel space-y-4">
      <div className="admin-stores-search">
        <Search className="admin-stores-search-icon" aria-hidden="true" />
        <Input
          id="admin-suppliers-search"
          className="admin-stores-search-input"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nombre o correo…"
          aria-label="Buscar proveedores"
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className="admin-stores-table-shell">
        <div className="admin-stores-table-scroll">
          <table className="admin-stores-table">
            <thead>
              <tr>
                <th className="admin-stores-th">Nombre</th>
                <th className="admin-stores-th">Correo</th>
                <th className="admin-stores-th">Teléfono</th>
                <th className="admin-stores-th">Ubicación</th>
                <th className="admin-stores-th admin-stores-th-num">Productos</th>
                <th className="admin-stores-th">Vitrina pública habilitada</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => (
                <tr key={row.userId} className="admin-stores-row">
                  <td className="admin-stores-td">
                    <div className="admin-stores-store-name">{row.companyName}</div>
                    {row.contactName && row.contactName !== "—" ? (
                      <div className="admin-stores-store-slug">{row.contactName}</div>
                    ) : null}
                  </td>
                  <td className="admin-stores-td">
                    <span className="admin-stores-email" title={row.email || undefined}>
                      {row.email || "—"}
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
                        {formatDirectoryPhone(row.phone)}
                      </a>
                    ) : (
                      <span className="admin-stores-td-muted">
                        {formatDirectoryPhone(row.phone)}
                      </span>
                    )}
                  </td>
                  <td className="admin-stores-td admin-stores-td-muted">
                    {row.location || "—"}
                  </td>
                  <td className="admin-stores-td admin-stores-td-num">
                    {row.activeProductCount.toLocaleString("es-VE")}
                  </td>
                  <td className="admin-stores-td">
                    <div className="flex items-center gap-2">
                      <SettingsSwitch
                        id={`directory-public-catalog-${row.userId}`}
                        checked={row.showPublicCatalog === true}
                        disabled={busyUserId === row.userId}
                        label={`Vitrina pública habilitada de ${row.companyName}`}
                        onChange={(checked) =>
                          void handlePublicCatalogToggle(row, checked)
                        }
                      />
                      {row.showPublicCatalog && row.publicCatalogSlug ? (
                        <a
                          href={`/vitrina/${row.publicCatalogSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-stores-link inline-flex items-center gap-1"
                        >
                          Enlace
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="admin-stores-td-muted">Apagada</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-stores-empty-state">
                    No hay proveedores con esa búsqueda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {filtered.length > DIRECTORY_PAGE_SIZE ? (
          <div className="admin-stores-pagination">
            <p className="admin-stores-page-range">
              {filtered.length.toLocaleString("es-VE")} proveedores
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
