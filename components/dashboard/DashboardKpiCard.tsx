import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type DashboardKpiTone = "default" | "warning" | "active";

function isZeroMetricValue(value: string): boolean {
  if (value === "—" || value === "0") return true;
  if (/^0(\.0+)?%$/.test(value)) return true;
  const numeric = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) && numeric === 0;
}

interface DashboardKpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  caption?: string;
  emptyHint?: string;
  tone?: DashboardKpiTone;
  interactive?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function DashboardKpiCard({
  label,
  value,
  icon: Icon,
  caption,
  emptyHint,
  tone = "default",
  interactive = false,
  isActive = false,
  onClick,
  className,
}: DashboardKpiCardProps) {
  const isZero = isZeroMetricValue(value);

  const cardClassName = cn(
    "dashboard-kpi-card",
    interactive && "dashboard-kpi-card-interactive",
    isActive && "dashboard-kpi-card-active",
    tone === "warning" && "dashboard-kpi-card-warning",
    className,
  );

  const content = (
    <>
      <div className="dashboard-kpi-card-header">
        <p className="dashboard-kpi-card-label">{label}</p>
        <span className="dashboard-kpi-card-icon" aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p
        className={cn(
          "dashboard-kpi-card-value",
          isZero && emptyHint && "dashboard-kpi-card-value-muted",
        )}
      >
        {value}
      </p>
      {emptyHint && isZero ? (
        <p className="dashboard-kpi-card-empty-hint">{emptyHint}</p>
      ) : caption ? (
        <p className="dashboard-kpi-card-caption">{caption}</p>
      ) : null}
    </>
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={cardClassName}>
        {content}
      </button>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
