/** Acceso al hub de mayoristas / proveedores (carga de productos). */
export const SUPPLIER_DASHBOARD_PATH = "/proveedor/dashboard";

/** Login con destino al panel de proveedores. */
export const SUPPLIER_ZONE_HREF = `/dashboard/login?next=${encodeURIComponent(SUPPLIER_DASHBOARD_PATH)}`;

/** Registro apuntando al panel de proveedores tras autenticarse. */
export const SUPPLIER_SIGNUP_HREF = `/signup?next=${encodeURIComponent(SUPPLIER_DASHBOARD_PATH)}`;
