import type { ComponentType } from "react";

interface SupplierEmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export function SupplierEmptyState({
  icon: Icon,
  title,
  description,
}: SupplierEmptyStateProps) {
  return (
    <div className="supplier-hub-empty">
      <span className="supplier-hub-empty-icon" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <p className="supplier-hub-empty-title">{title}</p>
      <p className="supplier-hub-empty-copy">{description}</p>
    </div>
  );
}
