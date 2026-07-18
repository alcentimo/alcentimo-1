"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import type { StoreCustomerSummary } from "@/lib/customers/get-store-customers";
import { formatUsd } from "@/lib/format";
import { normalizeWhatsAppPhone } from "@/lib/catalog/whatsapp-order";
import { CustomerWhatsAppButton } from "@/components/dashboard/customers/CustomerWhatsAppButton";

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

export function CustomersPanel({ customers, storeName }: CustomersPanelProps) {
  const [search, setSearch] = useState("");

  const filteredCustomers = useMemo(() => {
    const query = search.trim();
    if (!query) return customers;
    return customers.filter((customer) => customerMatchesSearch(customer, query));
  }, [customers, search]);

  const totals = useMemo(() => {
    return filteredCustomers.reduce(
      (acc, customer) => {
        acc.count += 1;
        acc.orders += customer.orderCount;
        acc.spent += customer.totalSpentUsd;
        return acc;
      },
      { count: 0, orders: 0, spent: 0 },
    );
  }, [filteredCustomers]);

  return (
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
          {search.trim() ? " encontrados" : " registrados"}
        </p>
      </div>

      {customers.length === 0 ? (
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
      ) : filteredCustomers.length === 0 ? (
        <div className="card-panel px-6 py-10 text-center text-sm text-zinc-500">
          No hay clientes que coincidan con &ldquo;{search.trim()}&rdquo;.
        </div>
      ) : (
        <>
          <div className="customers-summary-row">
            <div className="customers-summary-card">
              <p className="customers-summary-label">Clientes</p>
              <p className="customers-summary-value">{totals.count}</p>
            </div>
            <div className="customers-summary-card">
              <p className="customers-summary-label">Pedidos</p>
              <p className="customers-summary-value">{totals.orders}</p>
            </div>
            <div className="customers-summary-card">
              <p className="customers-summary-label">Total gastado</p>
              <p className="customers-summary-value">{formatUsd(totals.spent)}</p>
            </div>
          </div>

          <div className="customers-mobile-list space-y-3 lg:hidden">
            {filteredCustomers.map((customer) => (
              <article key={customer.id} className="customers-mobile-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {customer.displayName?.trim() || "Sin nombre"}
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {customer.phone?.trim() || "Sin teléfono"}
                    </p>
                  </div>
                  <CustomerWhatsAppButton
                    customerName={customer.displayName}
                    phone={customer.phone}
                    storeName={storeName}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <dt className="text-zinc-500">Pedidos</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {customer.orderCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Gastado</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatUsd(customer.totalSpentUsd)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Última compra</dt>
                    <dd className="mt-0.5 font-medium text-zinc-700 dark:text-zinc-300">
                      {formatCustomerDate(customer.lastOrderAt)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <div className="orders-ops-table-shell hidden lg:block">
            <table className="orders-ops-table customers-table">
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Teléfono</th>
                  <th scope="col" className="text-right">
                    Pedidos
                  </th>
                  <th scope="col" className="text-right">
                    Total gastado
                  </th>
                  <th scope="col">Última compra</th>
                  <th scope="col" className="text-right">
                    Contacto
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {customer.displayName?.trim() || "Sin nombre"}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Registrado {formatCustomerDate(customer.registeredAt)}
                      </p>
                    </td>
                    <td className="text-sm text-zinc-700 dark:text-zinc-300">
                      {customer.phone?.trim() || "—"}
                    </td>
                    <td className="text-right text-sm font-medium tabular-nums">
                      {customer.orderCount}
                    </td>
                    <td className="text-right text-sm font-semibold tabular-nums">
                      {formatUsd(customer.totalSpentUsd)}
                    </td>
                    <td className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatCustomerDate(customer.lastOrderAt)}
                    </td>
                    <td className="text-right">
                      <CustomerWhatsAppButton
                        customerName={customer.displayName}
                        phone={customer.phone}
                        storeName={storeName}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
