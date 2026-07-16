import type { ReactNode } from "react";
import { PublicCatalogQuickLink } from "@/components/dashboard/PublicCatalogQuickLink";

interface DashboardPageHeaderProps {
  sectionLabel: string;
  title: string;
  description: ReactNode;
  storeSlug?: string | null;
  before?: ReactNode;
}

export function DashboardPageHeader({
  sectionLabel,
  title,
  description,
  storeSlug,
  before,
}: DashboardPageHeaderProps) {
  return (
    <header className="page-header">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {before}
          <p className="section-label">{sectionLabel}</p>
          <h1 className="page-header-title">{title}</h1>
          <p className="page-header-desc">{description}</p>
        </div>
        {storeSlug !== undefined ? (
          <PublicCatalogQuickLink
            storeSlug={storeSlug}
            className="mx-0 w-full shrink-0 sm:w-auto sm:min-w-[12rem]"
          />
        ) : null}
      </div>
    </header>
  );
}
