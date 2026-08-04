export const DASHBOARD_SHELL_REFRESH_EVENT = "alcentimo:dashboard-shell-refresh";

/** Pide al chrome del dashboard (sidebar, plan, progreso Pro) que vuelva a cargar datos. */
export function requestDashboardShellRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DASHBOARD_SHELL_REFRESH_EVENT));
}
