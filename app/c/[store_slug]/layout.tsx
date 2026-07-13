import type { ReactNode } from "react";

export default function TransactionalCatalogLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="txn-catalog-root">{children}</div>;
}
