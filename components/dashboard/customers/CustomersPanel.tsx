"use client";

import { Fragment, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import type { StoreCustomerSummary } from "@/lib/customers/get-store-customers";
import { formatUsd } from "@/lib/format";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import {
  CUSTOMER_SEGMENT_TABS,
  computeCustomerMetrics,
  groupCustomersByActivityMonth,
  matchesCustomerSegment,
  type CustomerSegment,
} from "@/lib/customers/customer-segments";
import { CustomerWhatsAppButton } from "@/components/dashboard/customers/CustomerWhatsAppButton";
import { CustomerDetailSlideOver } from "@/components/dashboard/customers/CustomerDetailSlideOver";
import { cn } from "@/lib/cn";

interface CustomersPanelProps {
  customers: StoreCustomerSummary[];
  storeName: string;
}

function formatCustomerDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function customerMatchesSearch(
  customer: StoreCustomerSummary,
  query: string,
): boolean {
  if (!query) return true;

  const name = normalizeSearchText(customer.displayName ?? "");
  const phoneDigits = normalizeWhatsAppPhone(String(customer.phone ?? ""));
  const queryDigits = normalizeWhatsAppPhone(query);
  const queryLower = normalizeSearchText(query);

  if (name.includes(queryLower)) return true;
  if (queryDigits && phoneDigits?.includes(queryDigits)) return true;
  if (normalizeSearchText(String(customer.phone ?? "")).includes(queryLower)) {
    return true;
  }

  return false;
}

function CustomerMonthLabel({ label }: { label: string }) {
  return <p className="orders-ops-section-label">{label}</p>;
}

interface CustomerTableRowProps {
  customer: StoreCustomerSummary;
  storeName: string;
  onSelect: (customer: StoreCustomerSummary) => void;
}

function CustomerTableRow({
  customer,
  storeName,
  onSelect,
}: CustomerTableRowProps) {
  return (
    <tr
      key={customer.id}
      className="customers-table-row customers-table-row-clickable"
      onClick={() => onSelect(customer)}
    >
      <td className="customers-table-cell">
        <div className="min-w-0">
          <p className="customers-table-name truncate">
            {customer.displayName?.trim() || "Sin nombre"}
          </p>
          <p className="customers-table-meta truncate">
            Registrado {formatCustomerDate(customer.registeredAt)}
          </p>
        </div>
      </td>
      <td className="customers-table-cell">
        <p className="customers-table-phone truncate">
          {customer.phone?.trim() || "—"}
        </p>
      </td>
      <td className="customers-table-cell customers-table-cell-numeric">
        {customer.orderCount}
      </td>
      <td className="customers-table-cell customers-table-cell-numeric customers-table-cell-amount">
        {formatUsd(customer.totalSpentUsd)}
      </td>
      <td className="customers-table-cell">
        <p className="customers-table-date truncate">
          {formatCustomerDate(customer.lastOrderAt)}
        </p>
      </td>
      <td className="customers-table-cell customers-table-cell-action">
        <div
          className="inline-flex"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <CustomerWhatsAppButton
            customerName={customer.displayName}
            phone={customer.phone}
            storeName={storeName}
          />
        </div>
      </td>
    </tr>
  );
}

interface CustomerMobileCardProps {
  customer: StoreCustomerSummary;
  storeName: string;
  onSelect: (customer: StoreCustomerSummary) => void;
}

function CustomerMobileCard({
  customer,
  storeName,
  onSelect,
}: CustomerMobileCardProps) {
  return (
    <article
      className="customers-mobile-card customers-mobile-card-clickable"
      onClick={() => onSelect(customer)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(customer);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="customers-table-name truncate">
            {customer.displayName?.trim() || "Sin nombre"}
          </h2>
          <p className="customers-table-meta truncate">
            {customer.phone?.trim() || "Sin teléfono"}
          </p>
        </div>
        <div
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <CustomerWhatsAppButton
            customerName={customer.displayName}
            phone={customer.phone}
            storeName={storeName}
          />
        </div>
      </div>
      <dl className="customers-mobile-metrics">
        <div>
          <dt className="customers-summary-label">Pedidos</dt>
          <dd className="customers-mobile-metric-value">{customer.orderCount}</dd>
        </div>
        <div>
          <dt className="customers-summary-label">Gastado</dt>
          <dd className="customers-mobile-metric-value">
            {formatUsd(customer.totalSpentUsd)}
          </dd>
        </div>
        <div>
          <dt className="customers-summary-label">Última compra</dt>
          <dd className="customers-mobile-metric-date truncate">
            {formatCustomerDate(customer.lastOrderAt)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function CustomersPanel({ customers, storeName }: CustomersPanelProps) {
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<CustomerSegment>("all");
  const [selectedCustomer, setSelectedCustomer] =
    useState<StoreCustomerSummary | null>(null);

  const filteredCustomers = useMemo(() => {
    const query = search.trim();
    return customers.filter(
      (customer) =>
        matchesCustomerSegment(customer, segment) &&
        customerMatchesSearch(customer, query),
    );
  }, [customers, search, segment]);

  const groupedCustomers = useMemo(
    () => groupCustomersByActivityMonth(filteredCustomers),
    [filteredCustomers],
  );

  const metrics = useMemo(
    () => computeCustomerMetrics(filteredCustomers),
    [filteredCustomers],
  );

  const segmentCounts = useMemo(() => {
    const query = search.trim();
    const searched = customers.filter((customer) =>
      customerMatchesSearch(customer, query),
    );

    return {
      all: searched.length,
      vip: searched.filter((customer) =>
        matchesCustomerSegment(customer, "vip"),
      ).length,
      inactive: searched.filter((customer) =>
        matchesCustomerSegment(customer, "inactive"),
      ).length,
    };
  }, [customers, search]);

  function handleSelectCustomer(customer: StoreCustomerSummary) {
    setSelectedCustomer(customer);
  }

  function handleCloseSlideOver() {
    setSelectedCustomer(null);
  }

  const emptyStore = customers.length === 0;
  const emptyFilter = !emptyStore && filteredCustomers.length === 0;

  return (
    <>
      <div className="customers-panel space-y-5">
        <div className="customers-toolbar">
          <div className="relative w-full sm:max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o teléfono…"
              className="inventory-search-input"
              aria-label="Buscar clientes"
            />
          </div>
          <p className="text-sm text-zinc-500">
            {filteredCustomers.length} cliente
            {filteredCustomers.length === 1 ? "" : "s"}
            {search.trim() || segment !== "all" ? " en vista" : " registrados"}
          </p>
        </div>

        {!emptyStore ? (
          <div className="flex flex-wrap items-center gap-2">
            {CUSTOMER_SEGMENT_TABS.map((tab) => {
              const isActive = segment === tab.id;
              const count = segmentCounts[tab.id];

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSegment(tab.id)}
                  className={cn(
                    "min-h-9 rounded-full border px-3.5 text-xs font-medium transition-colors",
                    isActive
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300",
                  )}
                >
                  {tab.label}
                  <span className="ml-1.5 tabular-nums opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {emptyStore ? (
          <div className="card-panel flex flex-col items-center px-6 py-14 text-center">
            <Users className="h-10 w-10 text-zinc-300" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-100">
              Aún no tienes clientes registrados
            </p>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              Cuando alguien cree una cuenta en tu catálogo, aparecerá aquí con su
              historial de compras.
            </p>
          </div>
        ) : emptyFilter ? (
          <div className="card-panel px-6 py-10 text-center text-sm text-zinc-500">
            {search.trim()
              ? `No hay clientes que coincidan con "${search.trim()}" en este segmento.`
              : "No hay clientes en este segmento."}
          </div>
        ) : (
          <>
            <div className="customers-summary-row">
              <div className="customers-summary-card">
                <p className="customers-summary-label">Clientes</p>
                <p className="customers-summary-value">{metrics.count}</p>
              </div>
              <div className="customers-summary-card">
                <p className="customers-summary-label">Pedidos</p>
                <p className="customers-summary-value">{metrics.orders}</p>
              </div>
              <div className="customers-summary-card">
                <p className="customers-summary-label">Total gastado</p>
                <p className="customers-summary-value">{formatUsd(metrics.spent)}</p>
              </div>
              <div className="customers-summary-card">
                <p className="customers-summary-label">Ticket promedio</p>
                <p className="customers-summary-value">
                  {formatUsd(metrics.averageTicket)}
                </p>
              </div>
            </div>

            <div className="customers-mobile-list lg:hidden">
              {groupedCustomers.map((group) => (
                <div key={group.key} className="orders-ops-day-group">
                  <CustomerMonthLabel label={group.label} />
                  {group.customers.map((customer) => (
                    <CustomerMobileCard
                      key={customer.id}
                      customer={customer}
                      storeName={storeName}
                      onSelect={handleSelectCustomer}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="customers-table-shell hidden lg:block">
              <table className="customers-table">
                <colgroup>
                  <col className="customers-col-name" />
                  <col className="customers-col-phone" />
                  <col className="customers-col-numeric" />
                  <col className="customers-col-numeric" />
                  <col className="customers-col-date" />
                  <col className="customers-col-action" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Cliente</th>
                    <th scope="col">Teléfono</th>
                    <th scope="col" className="customers-table-th-numeric">
                      Pedidos
                    </th>
                    <th scope="col" className="customers-table-th-numeric">
                      Total gastado
                    </th>
                    <th scope="col">Última compra</th>
                    <th scope="col" className="customers-table-th-action">
                      Contacto
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedCustomers.map((group) => (
                    <Fragment key={group.key}>
                      <tr className="orders-ops-section-row">
                        <td colSpan={6}>{group.label}</td>
                      </tr>
                      {group.customers.map((customer) => (
                        <CustomerTableRow
                          key={customer.id}
                          customer={customer}
                          storeName={storeName}
                          onSelect={handleSelectCustomer}
                        />
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <CustomerDetailSlideOver
        customer={selectedCustomer}
        open={selectedCustomer !== null}
        storeName={storeName}
        onClose={handleCloseSlideOver}
      />
    </>
  );
}
