import type { ReactNode } from "react";

interface DashboardPageHeaderProps {
  sectionLabel?: string;
  title: string;
  description: ReactNode;
  before?: ReactNode;
  actions?: ReactNode;
}

export function DashboardPageHeader({
  sectionLabel,
  title,
  description,
  before,
  actions,
}: DashboardPageHeaderProps) {
  return (
    <header className="page-header">
      <div
        className={
          actions
            ? "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
            : undefined
        }
      >
        <div className="min-w-0 flex-1">
          {before}
          {sectionLabel ? <p className="section-label">{sectionLabel}</p> : null}
          <h1 className="page-header-title">{title}</h1>
          <p className="page-header-desc">{description}</p>
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center self-start">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
