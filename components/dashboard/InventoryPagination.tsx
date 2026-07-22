"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInventoryPageItems } from "@/lib/inventory/search";
import { cn } from "@/lib/cn";

interface InventoryPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

export function InventoryPagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  disabled = false,
  onPageChange,
}: InventoryPaginationProps) {
  if (totalCount <= 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  const pageItems = getInventoryPageItems(page, totalPages);

  return (
    <div className="inventory-pagination">
      <p className="inventory-pagination-summary">
        Mostrando{" "}
        <span className="tabular-nums font-medium text-zinc-700 dark:text-zinc-200">
          {from}–{to}
        </span>{" "}
        de{" "}
        <span className="tabular-nums font-medium text-zinc-700 dark:text-zinc-200">
          {totalCount}
        </span>{" "}
        producto{totalCount === 1 ? "" : "s"}
      </p>

      <div className="inventory-pagination-controls" role="navigation" aria-label="Paginación">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inventory-pagination-nav"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Anterior
        </Button>

        <div className="inventory-pagination-pages">
          {pageItems.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="inventory-pagination-ellipsis"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                disabled={disabled}
                onClick={() => onPageChange(item)}
                className={cn(
                  "inventory-pagination-page",
                  item === page && "inventory-pagination-page-active",
                )}
                aria-label={`Ir a la página ${item}`}
                aria-current={item === page ? "page" : undefined}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inventory-pagination-nav"
          aria-label="Página siguiente"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
