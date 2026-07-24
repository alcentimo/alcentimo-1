import type { ReactNode } from "react";

interface DashboardPageHeaderProps {
  sectionLabel?: string;
  title: string;
  description: ReactNode;
  before?: ReactNode;
}

export function DashboardPageHeader({
  sectionLabel,
  title,
  description,
  before,
}: DashboardPageHeaderProps) {
  return (
    <header className="page-header">
      {before}
      {sectionLabel ? <p className="section-label">{sectionLabel}</p> : null}
      <h1 className="page-header-title">{title}</h1>
      <p className="page-header-desc">{description}</p>
    </header>
  );
}
