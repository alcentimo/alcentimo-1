import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

interface DashboardCriticalStockAlertProps {
  count: number;
  className?: string;
}

export function DashboardCriticalStockAlert({
  count,
  className,
}: DashboardCriticalStockAlertProps) {
  if (count <= 0) return null;

  return (
    <Link
      href="/dashboard/catalogo?stock=bajo"
      className={cn("dashboard-critical-stock-alert", className)}
      aria-label={`Ver ${count} productos con bajo stock`}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline">Productos con bajo stock:</span>
      <span className="sm:hidden">Bajo stock:</span>
      <span className="tabular-nums font-semibold">{count}</span>
    </Link>
  );
}
