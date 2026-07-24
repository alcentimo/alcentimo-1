import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

interface DashboardEmptyMetricProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  compact?: boolean;
  className?: string;
}

export function DashboardEmptyMetric({
  icon: Icon,
  title,
  description,
  compact = false,
  className,
}: DashboardEmptyMetricProps) {
  return (
    <div
      className={cn(
        "dashboard-empty-metric",
        compact && "dashboard-empty-metric-compact",
        className,
      )}
    >
      <span className="dashboard-empty-metric-icon" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <p className="dashboard-empty-metric-title">{title}</p>
      {description ? (
        <p className="dashboard-empty-metric-desc">{description}</p>
      ) : null}
    </div>
  );
}
