"use client";

import { createContext, useContext } from "react";

export type DashboardShellMetrics = {
  pendingOrdersCount: number;
};

const DashboardShellMetricsContext = createContext<DashboardShellMetrics>({
  pendingOrdersCount: 0,
});

export function DashboardShellMetricsProvider({
  value,
  children,
}: {
  value: DashboardShellMetrics;
  children: React.ReactNode;
}) {
  return (
    <DashboardShellMetricsContext.Provider value={value}>
      {children}
    </DashboardShellMetricsContext.Provider>
  );
}

export function useDashboardShellMetrics(): DashboardShellMetrics {
  return useContext(DashboardShellMetricsContext);
}
